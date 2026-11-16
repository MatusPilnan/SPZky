-- Sightings synced from the app (one row per spotted plate), mirroring the
-- local Dexie `Sighting` (src/lib/db/types.ts). See docs/PLAN.md, "Sync — phase 7".

create table public.sightings (
	id uuid primary key,
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	collection_id text not null check (char_length(collection_id) between 1 and 32),
	-- null = nationwide plate (then plate_type is required)
	region_code text check (char_length(region_code) between 1 and 8),
	plate_type text check (char_length(plate_type) between 1 and 32),
	plate text check (char_length(plate) between 1 and 32),
	plate_normalized text check (char_length(plate_normalized) between 1 and 32),
	seen_at timestamptz not null,
	created_at timestamptz not null,
	-- last change on the device; drives last-write-wins
	updated_at timestamptz not null,
	lat double precision check (lat between -90 and 90),
	lng double precision check (lng between -180 and 180),
	accuracy real check (accuracy >= 0),
	note text not null default '' check (char_length(note) <= 2000),
	deleted boolean not null default false,
	-- set by the trigger on every write; the pull cursor, independent of device clocks
	server_updated_at timestamptz not null default clock_timestamp(),
	constraint nationwide_needs_type check (region_code is not null or plate_type is not null),
	constraint plate_pair check ((plate is null) = (plate_normalized is null)),
	constraint location_pair check ((lat is null) = (lng is null))
);

comment on table public.sightings is 'License plates spotted by a user; synced from the ŠPZ-ky app.';

create index sightings_user_cursor on public.sightings (user_id, server_updated_at);

-- Every write moves the row past all pull cursors; the owner never changes.
create function public.sightings_touch() returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.server_updated_at := clock_timestamp();
	if tg_op = 'UPDATE' then
		new.user_id := old.user_id;
	end if;
	return new;
end;
$$;

create trigger sightings_touch
	before insert or update on public.sightings
	for each row execute function public.sightings_touch();

-- Row-level security: everyone sees and changes only their own rows.
alter table public.sightings enable row level security;

create policy "own rows: select" on public.sightings
	for select to authenticated
	using (user_id = (select auth.uid()));

create policy "own rows: insert" on public.sightings
	for insert to authenticated
	with check (user_id = (select auth.uid()));

create policy "own rows: update" on public.sightings
	for update to authenticated
	using (user_id = (select auth.uid()))
	with check (user_id = (select auth.uid()));

-- Hard delete, used by "Delete my cloud data".
create policy "own rows: delete" on public.sightings
	for delete to authenticated
	using (user_id = (select auth.uid()));

revoke all on public.sightings from anon, authenticated;
grant select, insert, update, delete on public.sightings to authenticated;

-- Upserts the caller's rows. An existing row is only overwritten when the
-- incoming updated_at is newer (last-write-wins, decided on the server).
-- Returns the server's version of every row that was NOT taken because the
-- server holds a newer one, so the device can adopt it right away.
create function public.push_sightings(rows jsonb)
returns setof public.sightings
language plpgsql
security invoker
set search_path = ''
as $$
begin
	if jsonb_typeof(rows) is distinct from 'array' then
		raise exception 'rows must be a JSON array' using errcode = '22023';
	end if;
	if jsonb_array_length(rows) > 500 then
		raise exception 'at most 500 rows per call' using errcode = '22023';
	end if;

	insert into public.sightings as s (
		id, user_id, collection_id, region_code, plate_type, plate, plate_normalized,
		seen_at, created_at, updated_at, lat, lng, accuracy, note, deleted
	)
	select
		r.id, auth.uid(), r.collection_id, r.region_code, r.plate_type, r.plate, r.plate_normalized,
		r.seen_at, r.created_at, r.updated_at, r.lat, r.lng, r.accuracy, coalesce(r.note, ''),
		coalesce(r.deleted, false)
	from jsonb_populate_recordset(null::public.sightings, rows) as r
	on conflict (id) do update set
		collection_id = excluded.collection_id,
		region_code = excluded.region_code,
		plate_type = excluded.plate_type,
		plate = excluded.plate,
		plate_normalized = excluded.plate_normalized,
		seen_at = excluded.seen_at,
		created_at = excluded.created_at,
		updated_at = excluded.updated_at,
		lat = excluded.lat,
		lng = excluded.lng,
		accuracy = excluded.accuracy,
		note = excluded.note,
		deleted = excluded.deleted
	where s.updated_at < excluded.updated_at;

	return query
		select s.*
		from public.sightings as s
		join jsonb_populate_recordset(null::public.sightings, rows) as r on r.id = s.id
		where s.updated_at > r.updated_at;
end;
$$;

-- "Use this device's data" at sign-in: the given rows become the caller's
-- whole collection. They are upserted unconditionally and every other row of
-- the caller is soft-deleted (so other devices drop it on their next pull),
-- all in one transaction.
create function public.replace_sightings(rows jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
	if jsonb_typeof(rows) is distinct from 'array' then
		raise exception 'rows must be a JSON array' using errcode = '22023';
	end if;
	if jsonb_array_length(rows) > 20000 then
		raise exception 'at most 20000 rows per call' using errcode = '22023';
	end if;

	insert into public.sightings as s (
		id, user_id, collection_id, region_code, plate_type, plate, plate_normalized,
		seen_at, created_at, updated_at, lat, lng, accuracy, note, deleted
	)
	select
		r.id, auth.uid(), r.collection_id, r.region_code, r.plate_type, r.plate, r.plate_normalized,
		r.seen_at, r.created_at, r.updated_at, r.lat, r.lng, r.accuracy, coalesce(r.note, ''),
		coalesce(r.deleted, false)
	from jsonb_populate_recordset(null::public.sightings, rows) as r
	on conflict (id) do update set
		collection_id = excluded.collection_id,
		region_code = excluded.region_code,
		plate_type = excluded.plate_type,
		plate = excluded.plate,
		plate_normalized = excluded.plate_normalized,
		seen_at = excluded.seen_at,
		created_at = excluded.created_at,
		updated_at = excluded.updated_at,
		lat = excluded.lat,
		lng = excluded.lng,
		accuracy = excluded.accuracy,
		note = excluded.note,
		deleted = excluded.deleted;

	update public.sightings as s
	set deleted = true, updated_at = now()
	where s.user_id = auth.uid()
		and not s.deleted
		and s.id not in (select r.id from jsonb_populate_recordset(null::public.sightings, rows) as r);
end;
$$;

revoke all on function public.push_sightings(jsonb) from public, anon;
revoke all on function public.replace_sightings(jsonb) from public, anon;
grant execute on function public.push_sightings(jsonb) to authenticated;
grant execute on function public.replace_sightings(jsonb) to authenticated;
revoke all on function public.sightings_touch() from public, anon, authenticated;
