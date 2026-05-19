-- Execute in Supabase SQL Editor (owner privileges required).
-- Purpose: isolate `storage.objects` rows for buckets `documents` and `exports` by organization.
-- Expected object path format: "<organizationId>/<uuid>-<filename>".
--
-- Buckets couverts :
--   documents  — fichiers uploadés par l'API (pièces jointes, docs internes)
--   exports    — exports CSV planifiés (accès interne uniquement)
--
-- À appliquer dans le SQL Editor Supabase (rôle postgres / owner).
-- Idempotent (DROP IF EXISTS avant chaque CREATE).

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

-- ============================================================
-- Bucket : exports  (exports CSV planifiés — interne uniquement)
-- ============================================================
-- Créer le bucket dans Supabase Dashboard avant d'appliquer ces politiques.
-- Le bucket doit être privé (non public).
-- Format attendu : "<organizationId>/<filename>.csv"

create or replace function app.is_internal_user()
returns boolean
language sql
stable
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'user_role',
    auth.jwt() ->> 'user_role'
  ) in ('admin', 'member');
$$;

drop policy if exists exports_storage_select on storage.objects;
create policy exports_storage_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'exports'
  and (storage.foldername(name))[1] = app.current_organization_id()
  and app.is_internal_user()
);

drop policy if exists exports_storage_insert on storage.objects;
create policy exports_storage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'exports'
  and (storage.foldername(name))[1] = app.current_organization_id()
  and app.is_internal_user()
);

drop policy if exists exports_storage_delete on storage.objects;
create policy exports_storage_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'exports'
  and (storage.foldername(name))[1] = app.current_organization_id()
  and app.is_internal_user()
);
