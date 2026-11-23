create type public.appointment_status as enum (
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED'
);

create table public.appointment_slots (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  time_zone text not null check (length(time_zone) between 1 and 64),
  active boolean not null default true,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint appointment_slots_valid_range check (ends_at > starts_at),
  constraint appointment_slots_start_future check (starts_at > created_at)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  service_id uuid not null references public.services (id) on delete restrict,
  service_title text not null,
  slot_id uuid not null references public.appointment_slots (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  time_zone text not null check (length(time_zone) between 1 and 64),
  customer_name text not null check (length(btrim(customer_name)) between 1 and 120),
  customer_email text not null check (length(customer_email) between 3 and 254),
  customer_phone text not null default '' check (length(customer_phone) <= 40),
  status public.appointment_status not null default 'PENDING',
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_valid_range check (ends_at > starts_at),
  constraint appointments_cancelled_at_matches_status check (
    (status = 'CANCELLED') = (cancelled_at is not null)
  ),
  constraint appointments_no_overlapping_active_times
    exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&)
    where (status in ('PENDING', 'CONFIRMED'))
);

create index appointment_slots_service_time_idx
  on public.appointment_slots (service_id, starts_at)
  where active;
create index appointment_slots_active_time_idx
  on public.appointment_slots (starts_at)
  where active;
create index appointments_user_created_idx
  on public.appointments (user_id, created_at desc);
create index appointments_status_time_idx
  on public.appointments (status, starts_at);

create trigger appointments_set_updated_at before update on public.appointments
for each row execute function public.set_updated_at();

create function public.validate_appointment_slot()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_slot public.appointment_slots%rowtype;
  v_service_status public.service_status;
  v_service_title text;
begin
  select * into v_slot
  from public.appointment_slots
  where id = new.slot_id;

  if not found
    or v_slot.service_id <> new.service_id
    or v_slot.starts_at <> new.starts_at
    or v_slot.ends_at <> new.ends_at
    or v_slot.time_zone <> new.time_zone
  then
    raise exception using errcode = '23514', message = 'APPOINTMENT_SLOT_MISMATCH';
  end if;

  select status, title into v_service_status, v_service_title
  from public.services
  where id = new.service_id;

  if tg_op = 'INSERT' then
    if v_service_status is distinct from 'ACTIVE'::public.service_status then
      raise exception using errcode = '23514', message = 'APPOINTMENT_SERVICE_UNAVAILABLE';
    end if;
    new.service_title := v_service_title;
    if not v_slot.active or v_slot.starts_at <= now() then
      raise exception using errcode = '23514', message = 'APPOINTMENT_SLOT_UNAVAILABLE';
    end if;
  else
    if new.service_id is distinct from old.service_id
      and v_service_status is distinct from 'ACTIVE'::public.service_status
    then
      raise exception using errcode = '23514', message = 'APPOINTMENT_SERVICE_UNAVAILABLE';
    end if;
    if new.slot_id is distinct from old.slot_id
      and (not v_slot.active or v_slot.starts_at <= now())
    then
      raise exception using errcode = '23514', message = 'APPOINTMENT_SLOT_UNAVAILABLE';
    end if;
    if new.user_id is distinct from old.user_id then
      raise exception using errcode = '42501', message = 'APPOINTMENT_OWNER_IMMUTABLE';
    end if;
    if old.status in ('CANCELLED', 'COMPLETED')
      and (
        new.status is distinct from old.status
        or new.slot_id is distinct from old.slot_id
        or new.service_id is distinct from old.service_id
      )
    then
      raise exception using errcode = '42501', message = 'APPOINTMENT_TERMINAL';
    end if;
    if new.status is distinct from old.status then
      if new.status not in ('CONFIRMED', 'CANCELLED', 'COMPLETED')
        or (old.status = 'PENDING' and new.status = 'COMPLETED')
      then
        raise exception using errcode = '42501', message = 'APPOINTMENT_STATUS_TRANSITION_INVALID';
      end if;
      if not (select public.is_admin()) and new.status <> 'CANCELLED' then
        raise exception using errcode = '42501', message = 'APPOINTMENT_STATUS_CHANGE_FORBIDDEN';
      end if;
    end if;
  end if;

  if new.status = 'CANCELLED' then
    if tg_op = 'UPDATE' then
      if old.status = 'CANCELLED' then
        new.cancelled_at := old.cancelled_at;
      else
        new.cancelled_at := now();
      end if;
    else
      new.cancelled_at := now();
    end if;
  elsif new.cancelled_at is not null then
    raise exception using errcode = '23514', message = 'APPOINTMENT_CANCELLED_AT_INVALID';
  end if;

  return new;
end;
$$;

create trigger appointments_validate_slot
before insert or update on public.appointments
for each row execute function public.validate_appointment_slot();

alter table public.appointment_slots enable row level security;
alter table public.appointments enable row level security;

revoke all on public.appointment_slots from public, anon, authenticated;
revoke all on public.appointments from public, anon, authenticated;
grant select on public.appointment_slots to anon, authenticated;
grant insert (
  service_id,
  starts_at,
  ends_at,
  time_zone,
  active,
  created_by
) on public.appointment_slots to authenticated;
grant update (active) on public.appointment_slots to authenticated;
grant select on public.appointments to authenticated;
grant insert (
  user_id,
  service_id,
  service_title,
  slot_id,
  starts_at,
  ends_at,
  time_zone,
  customer_name,
  customer_email,
  customer_phone,
  status
) on public.appointments to authenticated;
grant update (
  slot_id,
  starts_at,
  ends_at,
  time_zone,
  customer_name,
  customer_email,
  customer_phone,
  status,
  cancelled_at
) on public.appointments to authenticated;

create policy "appointment_slots_public_read_available"
on public.appointment_slots
for select to anon, authenticated
using (
  active
  and starts_at > now()
  and exists (
    select 1 from public.services
    where services.id = appointment_slots.service_id
      and services.status = 'ACTIVE'
  )
);
create policy "appointment_slots_admin_manage"
on public.appointment_slots
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "appointments_read_own_or_admin"
on public.appointments
for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "appointments_create_own"
on public.appointments
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'PENDING'
  and cancelled_at is null
  and exists (
    select 1 from public.appointment_slots
    where appointment_slots.id = appointments.slot_id
      and appointment_slots.service_id = appointments.service_id
      and appointment_slots.active
      and appointment_slots.starts_at > now()
  )
);
create policy "appointments_update_own"
on public.appointments
for update to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()))
with check (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "appointments_admin_manage"
on public.appointments
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));