alter table public.services
  add column brand text not null default '',
  add column family_name text not null default '',
  add column plan_name text not null default '',
  add column offer_source text not null default 'THIRD_PARTY_AUTHORIZED'
    check (offer_source in ('SELF_PROVIDED', 'THIRD_PARTY_AUTHORIZED')),
  add column duration_value smallint,
  add column duration_unit text not null default 'PERMANENT'
    check (duration_unit in ('DAY', 'MONTH', 'YEAR', 'PERMANENT')),
  add column previous_price numeric(12, 2),
  add column included_features text[] not null default '{}',
  add column distribution_method text not null default 'WHATSAPP_MANUAL'
    check (distribution_method in ('WHATSAPP_MANUAL', 'OFFICIAL_REDEMPTION_CODE', 'OFFICIAL_INVITATION', 'AUTHORIZED_DOWNLOAD', 'OTHER_AUTHORIZED')),
  add column distribution_authorized boolean not null default false,
  add column renewal_policy text not null default 'CONFIRM_MANUALLY'
    check (renewal_policy in ('RENEWABLE_MANUALLY', 'NOT_RENEWABLE', 'CONFIRM_MANUALLY')),
  add column license_type text not null default 'OTHER'
    check (license_type in ('SUBSCRIPTION', 'PERPETUAL_LICENSE', 'COURSE_ACCESS', 'DOWNLOAD', 'OTHER')),
  add column availability_status text not null default 'UNAVAILABLE'
    check (availability_status in ('AVAILABLE', 'ON_REQUEST', 'OUT_OF_STOCK', 'UNAVAILABLE')),
  add column stock_mode text not null default 'UNLIMITED'
    check (stock_mode in ('UNLIMITED', 'LIMITED')),
  add column stock_quantity integer,
  add column conditions text not null default '',
  add constraint services_digital_duration_check
    check (
      (duration_unit = 'PERMANENT' and duration_value is null)
      or (duration_unit <> 'PERMANENT' and duration_value > 0)
    ),
  add constraint services_digital_previous_price_check
    check (
      previous_price is null
      or (previous_price > 0 and price is not null and previous_price > price)
    ),
  add constraint services_digital_stock_check
    check (
      (stock_mode = 'UNLIMITED' and stock_quantity is null)
      or (stock_mode = 'LIMITED' and stock_quantity >= 0)
    );

-- Previously published digital listings must be reviewed before they can be
-- shown again. No product is presumed to have resale or transfer permission.
update public.services
set status = 'DRAFT'
where service_kind = 'DIGITAL'
  and status = 'ACTIVE';

alter table public.services
  add constraint services_digital_publish_requirements_check
  check (
    service_kind <> 'DIGITAL'
    or status <> 'ACTIVE'
    or (
      (
        offer_source = 'SELF_PROVIDED'
        or (
          distribution_authorized
          and brand <> ''
          and plan_name <> ''
        )
      )
      and price is not null
      and price > 0
      and availability_status <> 'UNAVAILABLE'
    )
  );

create table public.digital_service_admin_notes (
  service_id uuid primary key references public.services (id) on delete cascade,
  authorization_reference text not null default '',
  activation_instructions text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.digital_service_admin_notes enable row level security;
revoke all on public.digital_service_admin_notes from public, anon, authenticated;
grant select, insert, update on public.digital_service_admin_notes to authenticated;
grant select on public.digital_service_admin_notes to service_role;
create policy "digital_service_notes_admin_read" on public.digital_service_admin_notes
for select to authenticated using ((select public.is_admin()));
create policy "digital_service_notes_admin_insert" on public.digital_service_admin_notes
for insert to authenticated with check ((select public.is_admin()));
create policy "digital_service_notes_admin_update" on public.digital_service_admin_notes
for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create function public.guard_digital_service_publication()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.service_kind = 'DIGITAL' and new.status = 'ACTIVE' then
    if (new.offer_source = 'THIRD_PARTY_AUTHORIZED' and (
          not new.distribution_authorized
          or not exists (
            select 1 from public.digital_service_admin_notes as notes
            where notes.service_id = new.id
              and btrim(notes.authorization_reference) <> ''
          )
        ))
      or (new.offer_source = 'THIRD_PARTY_AUTHORIZED' and (new.brand = '' or new.plan_name = ''))
      or new.price is null
      or new.price <= 0
      or new.availability_status = 'UNAVAILABLE'
    then
      raise exception using errcode = '23514', message = 'DIGITAL_PRODUCT_NOT_READY_FOR_PUBLICATION';
    end if;
  end if;
  return new;
end;
$$;

create trigger services_guard_digital_publication
before insert or update on public.services
for each row execute function public.guard_digital_service_publication();

create function public.guard_digital_service_notes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if btrim(coalesce(new.authorization_reference, '')) = ''
    and exists (
      select 1 from public.services as service
      where service.id = new.service_id
        and service.service_kind = 'DIGITAL'
        and service.offer_source = 'THIRD_PARTY_AUTHORIZED'
        and service.status = 'ACTIVE'
    )
  then
    raise exception using errcode = '23514', message = 'DIGITAL_AUTHORIZATION_REFERENCE_REQUIRED';
  end if;
  return new;
end;
$$;

create trigger digital_service_notes_guard
before insert or update on public.digital_service_admin_notes
for each row execute function public.guard_digital_service_notes();

drop policy if exists "services_public_read_active" on public.services;
create policy "services_public_read_active" on public.services
for select to anon, authenticated
using (
  status = 'ACTIVE'
  and (
    service_kind <> 'DIGITAL'
    or offer_source = 'SELF_PROVIDED'
    or (offer_source = 'THIRD_PARTY_AUTHORIZED' and distribution_authorized = true)
  )
);

create index services_digital_catalog_idx
  on public.services (category_id, sort_order)
  where service_kind = 'DIGITAL'
    and status = 'ACTIVE'
    and (offer_source = 'SELF_PROVIDED' or distribution_authorized = true);

create table public.digital_orders (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete restrict,
  service_title text not null,
  brand text not null,
  family_name text not null,
  plan_name text not null,
  duration_value smallint,
  duration_unit text not null
    check (duration_unit in ('DAY', 'MONTH', 'YEAR', 'PERMANENT')),
  amount numeric(12, 2) not null check (amount > 0),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  payment_method text not null default 'WHATSAPP'
    check (payment_method = 'WHATSAPP'),
  payment_status text not null default 'PENDING'
    check (payment_status in ('PENDING', 'VERIFIED', 'REJECTED', 'CANCELLED')),
  payment_verified_at timestamptz,
  delivery_status text not null default 'PENDING'
    check (delivery_status in ('PENDING', 'DELIVERED', 'CANCELLED')),
  delivered_at timestamptz,
  expires_at timestamptz,
  delivery_notes text not null default '',
  stock_reserved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint digital_orders_duration_check
    check (
      (duration_unit = 'PERMANENT' and duration_value is null)
      or (duration_unit <> 'PERMANENT' and duration_value > 0)
    ),
  constraint digital_orders_dates_check
    check (
      expires_at is null
      or (delivered_at is not null and expires_at > delivered_at)
    )
);

create index digital_orders_service_created_idx
  on public.digital_orders (service_id, created_at desc);
create index digital_orders_payment_delivery_idx
  on public.digital_orders (payment_status, delivery_status, created_at desc);

create trigger digital_orders_set_updated_at before update on public.digital_orders
for each row execute function public.set_updated_at();

alter table public.digital_orders enable row level security;
revoke all on public.digital_orders from public, anon, authenticated;
grant select on public.digital_orders to authenticated;
grant update (payment_status, payment_verified_at, delivery_status, delivered_at, expires_at, delivery_notes, stock_reserved, updated_at)
  on public.digital_orders to authenticated;
grant all on public.digital_orders to service_role;

create policy "digital_orders_admin_read" on public.digital_orders
for select to authenticated
using ((select public.is_admin()));
create policy "digital_orders_admin_update" on public.digital_orders
for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create function public.create_digital_order(
  p_service_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_service public.services%rowtype;
  v_order_id uuid;
  v_reserved boolean := false;
begin
  select * into v_service
  from public.services
  where id = p_service_id
    and service_kind = 'DIGITAL'
  for update;

  if not found
    or v_service.status <> 'ACTIVE'
    or (v_service.offer_source = 'THIRD_PARTY_AUTHORIZED' and not v_service.distribution_authorized)
    or v_service.availability_status not in ('AVAILABLE', 'ON_REQUEST')
    or v_service.price is null
    or v_service.price <= 0
  then
    raise exception using errcode = 'P0001', message = 'DIGITAL_PRODUCT_UNAVAILABLE';
  end if;

  if v_service.stock_mode = 'LIMITED' then
    if coalesce(v_service.stock_quantity, 0) <= 0 then
      raise exception using errcode = 'P0001', message = 'DIGITAL_PRODUCT_OUT_OF_STOCK';
    end if;
    update public.services
      set stock_quantity = stock_quantity - 1
      where id = v_service.id;
    v_reserved := true;
  end if;

  insert into public.digital_orders (
    service_id, service_title, brand, family_name, plan_name,
    duration_value, duration_unit, amount,
    customer_name, customer_email, customer_phone,
    payment_method, stock_reserved
  ) values (
    v_service.id, v_service.title, v_service.brand, v_service.family_name, v_service.plan_name,
    v_service.duration_value, v_service.duration_unit, v_service.price,
    p_customer_name, lower(p_customer_email), p_customer_phone,
    'WHATSAPP', v_reserved
  ) returning id into v_order_id;

  return v_order_id;
end;
$$;

revoke all on function public.create_digital_order(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.create_digital_order(uuid, text, text, text) to service_role;

create function public.admin_update_digital_order(
  p_order_id uuid,
  p_payment_status text,
  p_delivery_status text,
  p_delivered_at timestamptz,
  p_expires_at timestamptz,
  p_delivery_notes text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.digital_orders%rowtype;
  v_delivered_at timestamptz;
  v_expires_at timestamptz;
begin
  if not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  if p_payment_status not in ('PENDING', 'VERIFIED', 'REJECTED', 'CANCELLED')
    or p_delivery_status not in ('PENDING', 'DELIVERED', 'CANCELLED')
  then
    raise exception using errcode = '22023', message = 'INVALID_ORDER_STATUS';
  end if;

  select * into v_order
  from public.digital_orders
  where id = p_order_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'ORDER_NOT_FOUND';
  end if;

  if p_delivery_status = 'DELIVERED' and p_payment_status <> 'VERIFIED' then
    raise exception using errcode = '22023', message = 'PAYMENT_MUST_BE_VERIFIED';
  end if;

  v_delivered_at := case
    when p_delivery_status = 'DELIVERED' then coalesce(p_delivered_at, v_order.delivered_at, now())
    else null
  end;
  v_expires_at := case
    when p_delivery_status <> 'DELIVERED' then null
    when p_expires_at is not null then p_expires_at
    when v_order.duration_unit = 'DAY' then v_delivered_at + make_interval(days => v_order.duration_value)
    when v_order.duration_unit = 'MONTH' then v_delivered_at + make_interval(months => v_order.duration_value)
    when v_order.duration_unit = 'YEAR' then v_delivered_at + make_interval(years => v_order.duration_value)
    else null
  end;

  if v_expires_at is not null and v_expires_at <= v_delivered_at then
    raise exception using errcode = '22023', message = 'INVALID_EXPIRY_DATE';
  end if;

  if v_order.stock_reserved
    and (
      p_payment_status in ('REJECTED', 'CANCELLED')
      or (p_delivery_status = 'CANCELLED' and p_payment_status <> 'VERIFIED')
    )
  then
    update public.services
      set stock_quantity = stock_quantity + 1
      where id = v_order.service_id
        and stock_mode = 'LIMITED';
  end if;

  update public.digital_orders
  set payment_status = p_payment_status,
      payment_verified_at = case
        when p_payment_status = 'VERIFIED' then coalesce(v_order.payment_verified_at, now())
        else null
      end,
      delivery_status = p_delivery_status,
      delivered_at = v_delivered_at,
      expires_at = v_expires_at,
      delivery_notes = left(coalesce(p_delivery_notes, ''), 2000),
      stock_reserved = v_order.stock_reserved
        and p_payment_status not in ('REJECTED', 'CANCELLED')
        and p_delivery_status not in ('DELIVERED', 'CANCELLED')
  where id = p_order_id;
end;
$$;

revoke all on function public.admin_update_digital_order(uuid, text, text, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.admin_update_digital_order(uuid, text, text, timestamptz, timestamptz, text) to authenticated;
