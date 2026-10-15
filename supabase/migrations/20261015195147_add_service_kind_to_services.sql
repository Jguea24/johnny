alter table public.services
  add column service_kind text not null default 'TECHNOLOGICAL'
  constraint services_service_kind_check
  check (service_kind in ('TECHNOLOGICAL', 'DIGITAL'));

create index services_kind_status_order_idx
  on public.services (service_kind, status, sort_order);
