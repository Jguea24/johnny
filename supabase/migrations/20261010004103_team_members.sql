create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  member_type text not null default 'COLLABORATOR'
    check (member_type in ('FOUNDER', 'COLLABORATOR')),
  full_name text not null default ''
    check (char_length(btrim(full_name)) <= 120),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  position text not null default ''
    check (char_length(btrim(position)) <= 160),
  specialty text not null default ''
    check (char_length(btrim(specialty)) <= 160),
  bio text not null default ''
    check (char_length(btrim(bio)) <= 2000),
  avatar_url text,
  avatar_path text,
  linkedin_url text
    check (
      linkedin_url is null
      or linkedin_url ~* '^https://([a-z0-9-]+\.)*linkedin\.com(/|$)'
    ),
  website_url text
    check (website_url is null or website_url ~* '^https://[^[:space:]]+$'),
  display_order integer not null default 0
    check (display_order between 0 and 100000),
  is_featured boolean not null default false,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_members_avatar_pair check (
    (avatar_url is null and avatar_path is null)
    or (avatar_url is not null and avatar_path is not null)
  ),
  constraint team_members_avatar_path check (
    avatar_path is null
    or avatar_path ~ '^team-members/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|avif)$'
  ),
  constraint team_members_founder_identity check (
    member_type <> 'FOUNDER'
    or (
      full_name = 'Johnny Grefa'
      and position = 'Fundador y responsable de la marca'
      and not is_featured
    )
  ),
  constraint team_members_published_complete check (
    not is_active
    or (
      char_length(btrim(full_name)) between 2 and 120
      and char_length(btrim(position)) between 2 and 160
      and char_length(btrim(bio)) between 10 and 2000
      and avatar_url is not null
      and avatar_path is not null
      and (
        member_type = 'FOUNDER'
        or char_length(btrim(specialty)) between 2 and 160
      )
    )
  )
);

create unique index team_members_single_founder_idx
  on public.team_members (member_type)
  where member_type = 'FOUNDER';

create unique index team_members_avatar_path_idx
  on public.team_members (avatar_path)
  where avatar_path is not null;

create index team_members_public_order_idx
  on public.team_members (member_type, display_order, created_at, id)
  where is_active;

create trigger team_members_set_updated_at
before update on public.team_members
for each row execute function public.set_updated_at();

create function public.protect_team_founder()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.member_type = 'FOUNDER' then
    raise exception 'The founder profile cannot be deleted';
  end if;

  if tg_op = 'UPDATE' and old.member_type = 'FOUNDER' and (
    new.member_type <> 'FOUNDER'
    or new.full_name <> 'Johnny Grefa'
    or new.position <> 'Fundador y responsable de la marca'
  ) then
    raise exception 'The founder identity cannot be changed';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger team_members_protect_founder
before update or delete on public.team_members
for each row execute function public.protect_team_founder();

alter table public.team_members enable row level security;

revoke all on public.team_members from public, anon, authenticated;
grant select on public.team_members to anon, authenticated;
grant insert, update, delete on public.team_members to authenticated;

create policy "team_members_public_read_active"
on public.team_members
for select to anon, authenticated
using (is_active);

create policy "team_members_admin_manage"
on public.team_members
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

insert into public.team_members (
  member_type,
  full_name,
  slug,
  position,
  bio,
  is_active
)
values (
  'FOUNDER',
  'Johnny Grefa',
  'johnny-grefa',
  'Fundador y responsable de la marca',
  'Soy Johnny Grefa, fundador y responsable de la marca Johnny. Junto a mis colaboradores, trabajamos para convertir necesidades reales en soluciones tecnológicas modernas, funcionales y confiables.',
  false
);