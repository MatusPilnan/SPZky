-- Address of a sighting's location ("Hlavná 12, Košice"), looked up once by a device
-- (OpenStreetMap Nominatim) and synced. null = not looked up yet, '' = nothing found.

alter table public.sightings
	add column place text check (char_length(place) <= 300);

-- Same as in 20261116120000_sightings.sql, plus `place`.
create or replace function public.push_sightings(rows jsonb)
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
		seen_at, created_at, updated_at, lat, lng, accuracy, place, note, deleted
	)
	select
		r.id, auth.uid(), r.collection_id, r.region_code, r.plate_type, r.plate, r.plate_normalized,
		r.seen_at, r.created_at, r.updated_at, r.lat, r.lng, r.accuracy, r.place, coalesce(r.note, ''),
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
		-- Older app versions don't send `place`: keep the stored address unless the spot moved.
		place = case
			when excluded.lat is distinct from s.lat or excluded.lng is distinct from s.lng then excluded.place
			else coalesce(excluded.place, s.place)
		end,
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

create or replace function public.replace_sightings(rows jsonb)
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
		seen_at, created_at, updated_at, lat, lng, accuracy, place, note, deleted
	)
	select
		r.id, auth.uid(), r.collection_id, r.region_code, r.plate_type, r.plate, r.plate_normalized,
		r.seen_at, r.created_at, r.updated_at, r.lat, r.lng, r.accuracy, r.place, coalesce(r.note, ''),
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
		-- Older app versions don't send `place`: keep the stored address unless the spot moved.
		place = case
			when excluded.lat is distinct from s.lat or excluded.lng is distinct from s.lng then excluded.place
			else coalesce(excluded.place, s.place)
		end,
		note = excluded.note,
		deleted = excluded.deleted;

	update public.sightings as s
	set deleted = true, updated_at = now()
	where s.user_id = auth.uid()
		and not s.deleted
		and s.id not in (select r.id from jsonb_populate_recordset(null::public.sightings, rows) as r);
end;
$$;
