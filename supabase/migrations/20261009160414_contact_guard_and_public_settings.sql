-- Proposal for public contact protection and an explicit public-settings allowlist.
-- Apply only after the server-side Turnstile, Upstash, and secret-key configuration is ready.

drop policy if exists "contact_messages_public_create"
  on public.contact_messages;

revoke insert on table public.contact_messages
  from public, anon, authenticated;

grant insert on table public.contact_messages
  to service_role;

drop policy if exists "site_settings_public_read"
  on public.site_settings;

revoke select on table public.site_settings
  from public, anon, authenticated;

grant select (key, value) on table public.site_settings
  to anon, authenticated;

create policy "site_settings_public_read_allowlisted"
  on public.site_settings
  for select
  to anon, authenticated
  using (
    key = any (
      array[
        'site.title',
        'site.description',
        'contact.email',
        'contact.phone',
        'contact.location',
        'social.github',
        'social.linkedin',
        'social.instagram',
        'social.facebook'
      ]::text[]
    )
  );

create policy "site_settings_public_read_allowlist_guard"
  on public.site_settings
  as restrictive
  for select
  to anon, authenticated
  using (
    key = any (
      array[
        'site.title',
        'site.description',
        'contact.email',
        'contact.phone',
        'contact.location',
        'social.github',
        'social.linkedin',
        'social.instagram',
        'social.facebook'
      ]::text[]
    )
  );