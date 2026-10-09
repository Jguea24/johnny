create type public.user_role as enum ('USER', 'ADMIN');
create type public.category_type as enum ('SERVICE', 'PROJECT');
create type public.service_status as enum ('DRAFT', 'ACTIVE', 'INACTIVE');
create type public.project_status as enum ('DRAFT', 'PUBLISHED', 'ARCHIVED');
create type public.service_request_status as enum (
  'PENDIENTE',
  'EN_REVISION',
  'EN_PROCESO',
  'COMPLETADA',
  'CANCELADA'
);
create type public.request_priority as enum ('BAJA', 'NORMAL', 'ALTA', 'URGENTE');
create type public.contact_message_status as enum (
  'NUEVO',
  'LEIDO',
  'RESPONDIDO',
  'ARCHIVADO'
);
create type public.testimonial_status as enum ('DRAFT', 'ACTIVE', 'INACTIVE');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text not null,
  phone text,
  avatar_url text,
  role public.user_role not null default 'USER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  type public.category_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (type, slug)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  title text not null,
  slug text not null unique,
  short_description text not null,
  description text not null,
  icon text,
  image_url text,
  price numeric(12, 2) check (price is null or price >= 0),
  status public.service_status not null default 'DRAFT',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  title text not null,
  slug text not null unique,
  short_description text not null,
  description text not null,
  main_image text,
  demo_url text,
  repository_url text,
  technologies text[] not null default '{}',
  status public.project_status not null default 'DRAFT',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  company text,
  description text not null,
  budget numeric(12, 2) check (budget is null or budget >= 0),
  status public.service_request_status not null default 'PENDIENTE',
  priority public.request_priority not null default 'NORMAL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null,
  status public.contact_message_status not null default 'NUEVO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position text,
  company text,
  comment text not null,
  photo_url text,
  rating smallint not null default 5 check (rating between 1 and 5),
  status public.testimonial_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_.-]*$'),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create index services_category_id_idx on public.services (category_id);
create index services_public_listing_idx on public.services (status, sort_order);
create index projects_category_id_idx on public.projects (category_id);
create index projects_public_listing_idx on public.projects (status, featured, created_at desc);
create index project_images_project_order_idx on public.project_images (project_id, sort_order);
create index service_requests_user_created_idx on public.service_requests (user_id, created_at desc);
create index service_requests_status_created_idx on public.service_requests (status, created_at desc);
create index contact_messages_status_created_idx on public.contact_messages (status, created_at desc);
create index testimonials_public_listing_idx on public.testimonials (status, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories
for each row execute function public.set_updated_at();
create trigger services_set_updated_at before update on public.services
for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
for each row execute function public.set_updated_at();
create trigger service_requests_set_updated_at before update on public.service_requests
for each row execute function public.set_updated_at();
create trigger contact_messages_set_updated_at before update on public.contact_messages
for each row execute function public.set_updated_at();
create trigger testimonials_set_updated_at before update on public.testimonials
for each row execute function public.set_updated_at();

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'ADMIN'::public.user_role
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert or update of email on auth.users
for each row execute function public.handle_new_auth_user();

create function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an administrator can change profile roles';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_escalation
before update on public.profiles
for each row execute function public.prevent_profile_role_escalation();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.services enable row level security;
alter table public.projects enable row level security;
alter table public.project_images enable row level security;
alter table public.service_requests enable row level security;
alter table public.contact_messages enable row level security;
alter table public.testimonials enable row level security;
alter table public.site_settings enable row level security;

create policy "profiles_read_own_or_admin" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles_update_own_or_admin" on public.profiles
for update to authenticated
using (id = (select auth.uid()) or (select public.is_admin()))
with check (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles_admin_insert" on public.profiles
for insert to authenticated
with check ((select public.is_admin()));
create policy "profiles_admin_delete" on public.profiles
for delete to authenticated
using ((select public.is_admin()));

create policy "categories_public_read" on public.categories
for select to anon, authenticated using (true);
create policy "categories_admin_manage" on public.categories
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "services_public_read_active" on public.services
for select to anon, authenticated using (status = 'ACTIVE');
create policy "services_admin_manage" on public.services
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "projects_public_read_published" on public.projects
for select to anon, authenticated using (status = 'PUBLISHED');
create policy "projects_admin_manage" on public.projects
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "project_images_public_read_published" on public.project_images
for select to anon, authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = project_images.project_id
      and projects.status = 'PUBLISHED'
  )
);
create policy "project_images_admin_manage" on public.project_images
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "service_requests_read_own_or_admin" on public.service_requests
for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "service_requests_create_own" on public.service_requests
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'PENDIENTE'
  and priority = 'NORMAL'
);
create policy "service_requests_admin_manage" on public.service_requests
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "contact_messages_public_create" on public.contact_messages
for insert to anon, authenticated
with check (status = 'NUEVO');
create policy "contact_messages_admin_read" on public.contact_messages
for select to authenticated
using ((select public.is_admin()));
create policy "contact_messages_admin_manage" on public.contact_messages
for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "contact_messages_admin_delete" on public.contact_messages
for delete to authenticated
using ((select public.is_admin()));

create policy "testimonials_public_read_active" on public.testimonials
for select to anon, authenticated using (status = 'ACTIVE');
create policy "testimonials_admin_manage" on public.testimonials
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "site_settings_public_read" on public.site_settings
for select to anon, authenticated using (true);
create policy "site_settings_admin_manage" on public.site_settings
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('site-media', 'site-media', true)
on conflict (id) do update set public = excluded.public;

create policy "public_read_site_media" on storage.objects
for select to anon, authenticated
using (bucket_id in ('avatars', 'site-media'));
create policy "users_upload_own_avatar" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "users_update_own_avatar" on storage.objects
for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "users_delete_own_avatar" on storage.objects
for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "admins_manage_site_media" on storage.objects
for all to authenticated
using (bucket_id = 'site-media' and (select public.is_admin()))
with check (bucket_id = 'site-media' and (select public.is_admin()));
