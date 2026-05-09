-- Execute in Supabase SQL Editor (owner privileges required).
-- Purpose: isolate `storage.objects` rows for bucket `documents` by organization folder.
-- Expected object path format: "<organizationId>/<uuid>-<filename>".

create schema if not exists app;

create or replace function app.current_organization_id()
returns text
language sql
stable
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'organization_id',
    auth.jwt() ->> 'organization_id'
  );
$$;

alter table storage.objects enable row level security;

drop policy if exists documents_storage_select on storage.objects;
create policy documents_storage_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = app.current_organization_id()
);

drop policy if exists documents_storage_insert on storage.objects;
create policy documents_storage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = app.current_organization_id()
);

drop policy if exists documents_storage_update on storage.objects;
create policy documents_storage_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = app.current_organization_id()
)
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = app.current_organization_id()
);

drop policy if exists documents_storage_delete on storage.objects;
create policy documents_storage_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = app.current_organization_id()
);
