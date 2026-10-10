BEGIN;
SELECT plan(11);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  'a0000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'team-rls-admin@example.invalid',
  '',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Team RLS admin fixture"}',
  now(),
  now()
),
(
  'a0000000-0000-4000-8000-000000000002',
  'authenticated',
  'authenticated',
  'team-rls-user@example.invalid',
  '',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Team RLS user fixture"}',
  now(),
  now()
);

update public.profiles
set role = 'ADMIN'
where id = 'a0000000-0000-4000-8000-000000000001';

insert into public.team_members (
  id, member_type, full_name, slug, position, specialty, bio,
  avatar_url, avatar_path, is_active
)
values
(
  'b0000000-0000-4000-8000-000000000001',
  'COLLABORATOR',
  'RLS Fixture',
  'rls-public-fixture',
  'Fixture',
  'Testing',
  'Temporary pgTAP profile for RLS checks.',
  'https://example.invalid/public-fixture.png',
  'team-members/b0000000-0000-4000-8000-000000000001/c0000000-0000-4000-8000-000000000001.png',
  true
),
(
  'b0000000-0000-4000-8000-000000000002',
  'COLLABORATOR',
  'Draft Fixture',
  'rls-draft-fixture',
  'Fixture',
  'Testing',
  'Temporary unpublished pgTAP profile.',
  null,
  null,
  false
);

select ok(
  has_table_privilege('anon', 'public.team_members', 'select'),
  'anon has read access to published team profiles'
);
select ok(
  not has_table_privilege('anon', 'public.team_members', 'insert,update,delete'),
  'anon has no team write privileges'
);
select ok(
  has_table_privilege('authenticated', 'public.team_members', 'select'),
  'authenticated role can query profiles permitted by RLS'
);

set local role anon;
select results_eq(
  $$select slug from public.team_members where slug like 'rls-%' order by slug$$,
  array['rls-public-fixture'],
  'anon sees only active profiles'
);
select throws_ok(
  $$insert into public.team_members (slug) values ('rls-anon-insert')$$,
  '42501',
  null,
  'anon cannot insert team profiles'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}';
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000002';
select results_eq(
  $$select slug from public.team_members where slug like 'rls-%' order by slug$$,
  array['rls-public-fixture'],
  'ordinary authenticated users see only active profiles'
);
select results_eq(
  $$update public.team_members set display_order = 99 where slug = 'rls-public-fixture' returning slug$$,
  array[]::text[],
  'ordinary authenticated users cannot update team profiles'
);

set local request.jwt.claims =
  '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';
select results_eq(
  $$select slug from public.team_members where slug = 'rls-draft-fixture'$$,
  array['rls-draft-fixture'],
  'administrators can read drafts'
);
select results_eq(
  $$update public.team_members set display_order = 7 where slug = 'rls-draft-fixture' returning display_order::text$$,
  array['7'],
  'administrators can update team profiles'
);
select throws_ok(
  $$update public.team_members set full_name = 'Different Founder' where slug = 'johnny-grefa'$$,
  'P0001',
  'The founder identity cannot be changed',
  'the founder identity is protected from administrative changes'
);
select lives_ok(
  $$delete from public.team_members where slug = 'rls-draft-fixture'$$,
  'administrators can delete collaborator profiles'
);

SELECT * FROM finish();
ROLLBACK;
