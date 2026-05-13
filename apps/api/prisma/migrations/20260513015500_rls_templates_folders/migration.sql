-- RLS coverage for tables added after the initial tenant policies migration.
-- These tables are internal-only configuration/reference data scoped by organization.

alter table public.quote_templates enable row level security;
alter table public.contract_folders enable row level security;
alter table public.contract_templates enable row level security;

drop policy if exists quote_templates_select_internal on public.quote_templates;
create policy quote_templates_select_internal on public.quote_templates
for select to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists quote_templates_write_internal on public.quote_templates;
create policy quote_templates_write_internal on public.quote_templates
for all to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user())
with check ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists contract_folders_select_internal on public.contract_folders;
create policy contract_folders_select_internal on public.contract_folders
for select to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists contract_folders_write_internal on public.contract_folders;
create policy contract_folders_write_internal on public.contract_folders
for all to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user())
with check ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists contract_templates_select_internal on public.contract_templates;
create policy contract_templates_select_internal on public.contract_templates
for select to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists contract_templates_write_internal on public.contract_templates;
create policy contract_templates_write_internal on public.contract_templates
for all to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user())
with check ("organizationId" = app.current_organization_id() and app.is_internal_user());
