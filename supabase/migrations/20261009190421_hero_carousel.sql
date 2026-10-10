create table public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 2 and 120),
  description text not null check (char_length(btrim(description)) between 2 and 1000),
  media_type text not null check (media_type in ('image', 'video')),
  media_path text not null unique,
  alt_text text,
  poster_path text unique,
  cta_text text,
  cta_url text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hero_slides_image_alt_text check (
    media_type <> 'image' or char_length(btrim(coalesce(alt_text, ''))) between 2 and 300
  ),
  constraint hero_slides_video_alt_text check (
    media_type <> 'video' or alt_text is null
  ),
  constraint hero_slides_cta_pair check (
    (cta_text is null and cta_url is null)
    or (
      cta_text is not null
      and char_length(btrim(cta_text)) between 2 and 60
      and cta_url is not null
      and char_length(btrim(cta_url)) between 1 and 2048
    )
  )
);

create index hero_slides_public_order_idx
  on public.hero_slides (sort_order, created_at)
  where is_active;

create trigger hero_slides_set_updated_at
before update on public.hero_slides
for each row execute function public.set_updated_at();

alter table public.hero_slides enable row level security;

revoke all on public.hero_slides from anon, authenticated;
grant select on public.hero_slides to anon, authenticated;
grant insert, update, delete on public.hero_slides to authenticated;

create policy "hero_slides_public_read_active"
on public.hero_slides
for select to anon, authenticated
using (is_active);

create policy "hero_slides_admin_manage"
on public.hero_slides
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create function public.reorder_hero_slide(p_slide_id uuid, p_direction text)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  current_position bigint;
  target_position bigint;
  slide_count bigint;
begin
  if not (select public.is_admin()) then
    raise exception 'Administrator access required'
      using errcode = '42501';
  end if;

  if p_direction is null or p_direction not in ('up', 'down') then
    raise exception 'Invalid slide direction'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(74190213, 1);

  select position
  into current_position
  from (
    select
      id,
      row_number() over (order by sort_order, created_at, id) as position
    from public.hero_slides
  ) ordered
  where id = p_slide_id;

  if current_position is null then
    return false;
  end if;

  select count(*) into slide_count from public.hero_slides;
  target_position := current_position
    + case when p_direction = 'up' then -1 else 1 end;

  if target_position < 1 or target_position > slide_count then
    return false;
  end if;

  with ordered as (
    select
      id,
      row_number() over (order by sort_order, created_at, id) as position
    from public.hero_slides
  ),
  positions as (
    select
      id,
      case
        when p_direction = 'up' and position = current_position
          then current_position - 2
        when p_direction = 'up' and position = target_position
          then current_position - 1
        when p_direction = 'down' and position = current_position
          then current_position
        when p_direction = 'down' and position = target_position
          then current_position - 1
        else position - 1
      end::integer as new_sort_order
    from ordered
  )
  update public.hero_slides as slide
  set sort_order = positions.new_sort_order
  from positions
  where slide.id = positions.id
    and slide.sort_order is distinct from positions.new_sort_order;

  return true;
end;
$$;

revoke all on function public.reorder_hero_slide(uuid, text) from public;
grant execute on function public.reorder_hero_slide(uuid, text) to authenticated;

create table public.hero_carousel_settings (
  id smallint primary key default 1 check (id = 1),
  autoplay_enabled boolean not null default true,
  autoplay_interval_ms integer not null default 3000
    check (autoplay_interval_ms between 3000 and 2147483647),
  show_arrows boolean not null default true,
  show_indicators boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.hero_carousel_settings (id)
values (1)
on conflict (id) do nothing;

create trigger hero_carousel_settings_set_updated_at
before update on public.hero_carousel_settings
for each row execute function public.set_updated_at();

alter table public.hero_carousel_settings enable row level security;

revoke all on public.hero_carousel_settings from anon, authenticated;
grant select on public.hero_carousel_settings to anon, authenticated;
grant update on public.hero_carousel_settings to authenticated;

create policy "hero_carousel_settings_public_read"
on public.hero_carousel_settings
for select to anon, authenticated
using (id = 1);

create policy "hero_carousel_settings_admin_update"
on public.hero_carousel_settings
for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

update storage.buckets
set
  file_size_limit = 31457280,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'video/mp4',
    'video/webm'
  ]
where id = 'site-media';