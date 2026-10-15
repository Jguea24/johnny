alter table public.services
  add column tax_base0 numeric(12, 2) not null default 0 check (tax_base0 >= 0),
  add column tax_baseimp numeric(12, 2) not null default 0 check (tax_baseimp >= 0),
  add column tax_iva numeric(12, 2) not null default 0 check (tax_iva >= 0);

create table public.service_orders (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete restrict,
  service_title text not null,
  amount numeric(12, 2) not null check (amount > 0),
  tax_base0 numeric(12, 2) not null check (tax_base0 >= 0),
  tax_baseimp numeric(12, 2) not null check (tax_baseimp >= 0),
  tax_iva numeric(12, 2) not null check (tax_iva >= 0),
  currency text not null default 'USD' check (currency = 'USD'),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'PAID', 'FAILED')),
  customer_given_name text not null,
  customer_middle_name text not null,
  customer_surname text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_identification text not null,
  customer_address text not null,
  customer_postcode text not null,
  merchant_transaction_id text not null unique,
  datafast_checkout_id text unique,
  datafast_payment_id text,
  datafast_result_code text,
  datafast_payment_brand text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_orders_tax_total_check
    check (amount = tax_base0 + tax_baseimp + tax_iva)
);

create index service_orders_status_created_idx
  on public.service_orders (status, created_at desc);
create index service_orders_service_created_idx
  on public.service_orders (service_id, created_at desc);

create trigger service_orders_set_updated_at before update on public.service_orders
for each row execute function public.set_updated_at();

alter table public.service_orders enable row level security;
revoke all on public.service_orders from public, anon, authenticated;
grant select on public.service_orders to authenticated;
grant select, insert, update on public.service_orders to service_role;

create policy "service_orders_admin_read" on public.service_orders
for select to authenticated
using ((select public.is_admin()));
