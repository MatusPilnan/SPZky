-- pgTAP tests for public.sightings: row-level security, last-write-wins push,
-- replace at sign-in. Run with `npm run db:test` (supabase test db).
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

-- Start from an empty table (rows of earlier local runs); rolled back at the end.
delete from public.sightings;

-- Two users. auth.uid() reads the `sub` claim of request.jwt.claims.
insert into auth.users (id, email) values
	('aaaaaaaa-0000-0000-0000-000000000001', 'a@test.local'),
	('bbbbbbbb-0000-0000-0000-000000000002', 'b@test.local');

create function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end;
$$;

create function pg_temp.row_json(id text, updated text, extra jsonb default '{}') returns jsonb language sql as $$
	select jsonb_build_object(
		'id', id, 'collection_id', 'sk', 'region_code', 'BA', 'plate_type', 'sk-district',
		'plate', 'BA-123AB', 'plate_normalized', 'BA123AB', 'seen_at', '2026-11-01T10:00:00Z',
		'created_at', '2026-11-01T10:00:00Z', 'updated_at', updated, 'note', '', 'deleted', false
	) || extra;
$$;

-- Structure
select ok((select relrowsecurity from pg_class where oid = 'public.sightings'::regclass), 'RLS is enabled');
select has_index('public', 'sightings', 'sightings_user_cursor', 'pull cursor index exists');

-- Anonymous clients get nothing.
set local role anon;
select throws_ok('select count(*) from public.sightings', '42501', null, 'anon cannot read sightings');
select throws_ok($$select public.push_sightings('[]'::jsonb)$$, '42501', null, 'anon cannot push');
reset role;

-- User A pushes two rows.
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select is_empty(
	$$select * from public.push_sightings(jsonb_build_array(
		pg_temp.row_json('11111111-0000-0000-0000-000000000001', '2026-11-01T10:00:00Z'),
		pg_temp.row_json('11111111-0000-0000-0000-000000000002', '2026-11-01T10:00:00Z',
			'{"region_code": null, "plate_type": "ev", "plate": "EV-123AB", "plate_normalized": "EV123AB"}')
	))$$,
	'new rows are all accepted'
);
select results_eq('select count(*)::int from public.sightings', array[2], 'A sees own 2 rows');
select results_eq(
	$$select distinct user_id from public.sightings$$,
	$$values ('aaaaaaaa-0000-0000-0000-000000000001'::uuid)$$,
	'user_id comes from the session, not the payload'
);

-- Last-write-wins.
create temp table cursor_before on commit drop as
	select server_updated_at from public.sightings where id = '11111111-0000-0000-0000-000000000001';
grant select on cursor_before to authenticated;
select results_eq(
	$$select id::text, updated_at from public.push_sightings(jsonb_build_array(
		pg_temp.row_json('11111111-0000-0000-0000-000000000001', '2026-10-01T00:00:00Z', '{"note": "older"}')))$$,
	$$values ('11111111-0000-0000-0000-000000000001', '2026-11-01T10:00:00Z'::timestamptz)$$,
	'an older change is rejected and the server row returned'
);
select results_eq(
	$$select note from public.sightings where id = '11111111-0000-0000-0000-000000000001'$$,
	array[''],
	'the older change did not overwrite'
);
select is_empty(
	$$select * from public.push_sightings(jsonb_build_array(
		pg_temp.row_json('11111111-0000-0000-0000-000000000001', '2026-11-02T00:00:00Z', '{"note": "newer"}')))$$,
	'a newer change is accepted'
);
select results_eq(
	$$select note from public.sightings where id = '11111111-0000-0000-0000-000000000001'$$,
	array['newer'],
	'the newer change overwrote'
);
select ok(
	(select s.server_updated_at > c.server_updated_at
	 from public.sightings s, cursor_before c where s.id = '11111111-0000-0000-0000-000000000001'),
	'server_updated_at moves forward on every write'
);
select is_empty(
	$$select * from public.push_sightings(jsonb_build_array(
		pg_temp.row_json('11111111-0000-0000-0000-000000000001', '2026-11-02T00:00:00Z', '{"note": "same time"}')))$$,
	'an equal timestamp is not reported as rejected'
);
select results_eq(
	$$select note from public.sightings where id = '11111111-0000-0000-0000-000000000001'$$,
	array['newer'],
	'an equal timestamp does not overwrite'
);

-- Validation
select throws_ok(
	$$select public.push_sightings(jsonb_build_array(pg_temp.row_json(
		'11111111-0000-0000-0000-000000000009', '2026-11-01T10:00:00Z', '{"region_code": null, "plate_type": null}')))$$,
	'23514', null, 'a nationwide row needs a plate type'
);
select throws_ok($$select public.push_sightings('{}'::jsonb)$$, '22023', null, 'rows must be an array');
select throws_ok(
	$$select public.push_sightings((select jsonb_agg(pg_temp.row_json(gen_random_uuid()::text, '2026-11-01T10:00:00Z'))
		from generate_series(1, 501)))$$,
	'22023', null, 'at most 500 rows per push'
);
select throws_ok(
	$$insert into public.sightings (id, user_id, collection_id, region_code, seen_at, created_at, updated_at)
	  values ('11111111-0000-0000-0000-000000000010', 'bbbbbbbb-0000-0000-0000-000000000002', 'sk', 'BA', now(), now(), now())$$,
	'42501', null, 'A cannot insert rows for B'
);

-- User B sees and touches nothing of A's.
reset role;
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select is_empty('select * from public.sightings', 'B sees none of A''s rows');
select is_empty(
	$$update public.sightings set note = 'hacked' returning id$$,
	'B cannot update A''s rows'
);
select is_empty('delete from public.sightings returning id', 'B cannot delete A''s rows');
select throws_ok(
	$$select public.push_sightings(jsonb_build_array(
		pg_temp.row_json('11111111-0000-0000-0000-000000000001', '2030-01-01T00:00:00Z', '{"note": "hacked"}')))$$,
	'42501', null, 'B cannot overwrite A''s row by pushing its id'
);
select lives_ok(
	$$select public.replace_sightings(jsonb_build_array(
		pg_temp.row_json('22222222-0000-0000-0000-000000000001', '2026-11-01T10:00:00Z')))$$,
	'B can replace own data'
);
reset role;
select results_eq(
	$$select note, deleted from public.sightings where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' order by id$$,
	$$values ('newer', false), ('', false)$$,
	'A''s rows are untouched by B (including B''s replace)'
);

-- replace_sightings for A: keeps exactly the given rows.
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select lives_ok(
	$$select public.replace_sightings(jsonb_build_array(
		pg_temp.row_json('11111111-0000-0000-0000-000000000001', '2026-01-01T00:00:00Z', '{"note": "device"}'),
		pg_temp.row_json('11111111-0000-0000-0000-000000000003', '2026-11-03T00:00:00Z')))$$,
	'A replaces own data'
);
select results_eq(
	$$select id::text, note, deleted from public.sightings order by id$$,
	$$values ('11111111-0000-0000-0000-000000000001', 'device', false),
	         ('11111111-0000-0000-0000-000000000002', '', true),
	         ('11111111-0000-0000-0000-000000000003', '', false)$$,
	'given rows win even if older; other rows are soft-deleted'
);
select ok(
	(select updated_at > '2026-11-03'::timestamptz from public.sightings where id = '11111111-0000-0000-0000-000000000002'),
	'soft-deleted rows get a fresh updated_at so other devices take the deletion'
);

-- Hard delete of own rows ("Delete my cloud data").
select results_eq('with d as (delete from public.sightings returning 1) select count(*)::int from d', array[3], 'A can delete own rows');
reset role;
select results_eq(
	$$select count(*)::int from public.sightings where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'$$,
	array[1],
	'B''s rows survive A''s delete'
);

-- The owner never changes, even via a direct update.
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
update public.sightings set user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
reset role;
select results_eq(
	$$select user_id::text from public.sightings$$,
	array['bbbbbbbb-0000-0000-0000-000000000002'],
	'B cannot hand rows over to A'
);

-- Deleting the account removes its rows.
delete from auth.users where id = 'bbbbbbbb-0000-0000-0000-000000000002';
select is_empty(
	$$select * from public.sightings where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'$$,
	'rows are deleted with the account'
);

select * from finish();
rollback;
