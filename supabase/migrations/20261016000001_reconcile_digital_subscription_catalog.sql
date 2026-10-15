alter table public.services
  add column offer_source text not null default 'THIRD_PARTY_AUTHORIZED'
    check (offer_source in ('SELF_PROVIDED', 'THIRD_PARTY_AUTHORIZED'));

-- Require previously active digital listings to be reviewed under the updated
-- offer-source rules before they can be published again.
update public.services
set status = 'DRAFT'
where service_kind = 'DIGITAL'
  and status = 'ACTIVE';

alter table public.services
  drop constraint services_digital_publish_requirements_check,
  add constraint services_digital_publish_requirements_check
    check (
      service_kind <> 'DIGITAL'
      or status <> 'ACTIVE'
      or (
        (
          offer_source = 'SELF_PROVIDED'
          or (
            offer_source = 'THIRD_PARTY_AUTHORIZED'
            and distribution_authorized
            and brand <> ''
            and plan_name <> ''
          )
        )
        and price is not null
        and price > 0
        and availability_status <> 'UNAVAILABLE'
      )
    );

create or replace function public.guard_digital_service_publication()
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

create or replace function public.guard_digital_service_notes()
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

create or replace function public.create_digital_order(
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