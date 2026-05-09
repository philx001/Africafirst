-- RLS safety net for Supabase direct access.
-- API server uses service-role key and already enforces tenant checks.
-- These policies protect data if authenticated users query Postgres directly.

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

create or replace function app.current_user_role()
returns text
language sql
stable
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'user_role',
    auth.jwt() ->> 'user_role'
  );
$$;

create or replace function app.current_contact_id()
returns text
language sql
stable
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'contact_id',
    auth.jwt() ->> 'contact_id'
  );
$$;

create or replace function app.current_user_id()
returns text
language sql
stable
as $$
  select u.id
  from public.users u
  where u."supabaseId" = auth.uid()::text
    and u."organizationId" = app.current_organization_id()
  limit 1;
$$;

create or replace function app.is_internal_user()
returns boolean
language sql
stable
as $$
  select app.current_user_role() in ('admin', 'member');
$$;

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.accounts enable row level security;
alter table public.contacts enable row level security;
alter table public.deals enable row level security;
alter table public.quotes enable row level security;
alter table public.contracts enable row level security;
alter table public.projects enable row level security;
alter table public.project_phases enable row level security;
alter table public.tasks enable row level security;
alter table public.interactions enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.automation_rules enable row level security;
alter table public.workflow_logs enable row level security;

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
for select to authenticated
using (id = app.current_organization_id());

drop policy if exists organizations_update_internal on public.organizations;
create policy organizations_update_internal on public.organizations
for update to authenticated
using (id = app.current_organization_id() and app.is_internal_user())
with check (id = app.current_organization_id() and app.is_internal_user());

drop policy if exists users_select_internal on public.users;
create policy users_select_internal on public.users
for select to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists users_select_self_client on public.users;
create policy users_select_self_client on public.users
for select to authenticated
using (
  "organizationId" = app.current_organization_id()
  and app.current_user_role() = 'client'
  and "supabaseId" = auth.uid()::text
);

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
for update to authenticated
using (
  "organizationId" = app.current_organization_id()
  and "supabaseId" = auth.uid()::text
)
with check (
  "organizationId" = app.current_organization_id()
  and "supabaseId" = auth.uid()::text
);

drop policy if exists accounts_select_org on public.accounts;
create policy accounts_select_org on public.accounts
for select to authenticated
using ("organizationId" = app.current_organization_id());

drop policy if exists accounts_write_internal on public.accounts;
create policy accounts_write_internal on public.accounts
for all to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user())
with check ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists contacts_select_internal on public.contacts;
create policy contacts_select_internal on public.contacts
for select to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists contacts_select_client_self on public.contacts;
create policy contacts_select_client_self on public.contacts
for select to authenticated
using (
  "organizationId" = app.current_organization_id()
  and app.current_user_role() = 'client'
  and id = app.current_contact_id()
);

drop policy if exists contacts_write_internal on public.contacts;
create policy contacts_write_internal on public.contacts
for all to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user())
with check ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists deals_select_internal on public.deals;
create policy deals_select_internal on public.deals
for select to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists deals_select_client on public.deals;
create policy deals_select_client on public.deals
for select to authenticated
using (
  "organizationId" = app.current_organization_id()
  and app.current_user_role() = 'client'
  and "contactId" = app.current_contact_id()
);

drop policy if exists deals_write_internal on public.deals;
create policy deals_write_internal on public.deals
for all to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user())
with check ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists quotes_select_internal on public.quotes;
create policy quotes_select_internal on public.quotes
for select to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists quotes_select_client on public.quotes;
create policy quotes_select_client on public.quotes
for select to authenticated
using (
  "organizationId" = app.current_organization_id()
  and app.current_user_role() = 'client'
  and "contactId" = app.current_contact_id()
);

drop policy if exists quotes_write_internal on public.quotes;
create policy quotes_write_internal on public.quotes
for all to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user())
with check ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists contracts_select_internal on public.contracts;
create policy contracts_select_internal on public.contracts
for select to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists contracts_select_client on public.contracts;
create policy contracts_select_client on public.contracts
for select to authenticated
using (
  "organizationId" = app.current_organization_id()
  and app.current_user_role() = 'client'
  and "contactId" = app.current_contact_id()
);

drop policy if exists contracts_write_internal on public.contracts;
create policy contracts_write_internal on public.contracts
for all to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user())
with check ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists projects_select_internal on public.projects;
create policy projects_select_internal on public.projects
for select to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists projects_select_client on public.projects;
create policy projects_select_client on public.projects
for select to authenticated
using (
  "organizationId" = app.current_organization_id()
  and app.current_user_role() = 'client'
  and "contactId" = app.current_contact_id()
);

drop policy if exists projects_write_internal on public.projects;
create policy projects_write_internal on public.projects
for all to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user())
with check ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists project_phases_select_internal on public.project_phases;
create policy project_phases_select_internal on public.project_phases
for select to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_phases."projectId"
      and p."organizationId" = app.current_organization_id()
      and app.is_internal_user()
  )
);

drop policy if exists project_phases_select_client on public.project_phases;
create policy project_phases_select_client on public.project_phases
for select to authenticated
using (
  app.current_user_role() = 'client'
  and exists (
    select 1
    from public.projects p
    where p.id = project_phases."projectId"
      and p."organizationId" = app.current_organization_id()
      and p."contactId" = app.current_contact_id()
  )
);

drop policy if exists project_phases_write_internal on public.project_phases;
create policy project_phases_write_internal on public.project_phases
for all to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_phases."projectId"
      and p."organizationId" = app.current_organization_id()
      and app.is_internal_user()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_phases."projectId"
      and p."organizationId" = app.current_organization_id()
      and app.is_internal_user()
  )
);

drop policy if exists tasks_select_internal on public.tasks;
create policy tasks_select_internal on public.tasks
for select to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists tasks_select_client on public.tasks;
create policy tasks_select_client on public.tasks
for select to authenticated
using (
  "organizationId" = app.current_organization_id()
  and app.current_user_role() = 'client'
  and exists (
    select 1
    from public.projects p
    where p.id = tasks."projectId"
      and p."contactId" = app.current_contact_id()
  )
);

drop policy if exists tasks_write_internal on public.tasks;
create policy tasks_write_internal on public.tasks
for all to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user())
with check ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists interactions_select_internal on public.interactions;
create policy interactions_select_internal on public.interactions
for select to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists interactions_select_client on public.interactions;
create policy interactions_select_client on public.interactions
for select to authenticated
using (
  "organizationId" = app.current_organization_id()
  and app.current_user_role() = 'client'
  and "contactId" = app.current_contact_id()
);

drop policy if exists interactions_write_internal on public.interactions;
create policy interactions_write_internal on public.interactions
for all to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user())
with check ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists documents_select_internal on public.documents;
create policy documents_select_internal on public.documents
for select to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists documents_select_client on public.documents;
create policy documents_select_client on public.documents
for select to authenticated
using (
  "organizationId" = app.current_organization_id()
  and app.current_user_role() = 'client'
  and (
    "contactId" = app.current_contact_id()
    or exists (
      select 1
      from public.projects p
      where p.id = documents."projectId"
        and p."contactId" = app.current_contact_id()
    )
    or exists (
      select 1
      from public.deals d
      where d.id = documents."dealId"
        and d."contactId" = app.current_contact_id()
    )
  )
);

drop policy if exists documents_write_internal on public.documents;
create policy documents_write_internal on public.documents
for all to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user())
with check ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
for select to authenticated
using (
  "organizationId" = app.current_organization_id()
  and "userId" = app.current_user_id()
);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
for update to authenticated
using (
  "organizationId" = app.current_organization_id()
  and "userId" = app.current_user_id()
)
with check (
  "organizationId" = app.current_organization_id()
  and "userId" = app.current_user_id()
);

drop policy if exists messages_select_own on public.messages;
create policy messages_select_own on public.messages
for select to authenticated
using (
  "organizationId" = app.current_organization_id()
  and ("senderId" = app.current_user_id() or "recipientId" = app.current_user_id())
);

drop policy if exists messages_insert_own on public.messages;
create policy messages_insert_own on public.messages
for insert to authenticated
with check (
  "organizationId" = app.current_organization_id()
  and "senderId" = app.current_user_id()
  and exists (
    select 1
    from public.users u
    where u.id = messages."recipientId"
      and u."organizationId" = app.current_organization_id()
  )
);

drop policy if exists messages_update_own on public.messages;
create policy messages_update_own on public.messages
for update to authenticated
using (
  "organizationId" = app.current_organization_id()
  and "recipientId" = app.current_user_id()
)
with check (
  "organizationId" = app.current_organization_id()
  and "recipientId" = app.current_user_id()
);

drop policy if exists automation_rules_select_internal on public.automation_rules;
create policy automation_rules_select_internal on public.automation_rules
for select to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists automation_rules_write_internal on public.automation_rules;
create policy automation_rules_write_internal on public.automation_rules
for all to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user())
with check ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists workflow_logs_select_internal on public.workflow_logs;
create policy workflow_logs_select_internal on public.workflow_logs
for select to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists workflow_logs_write_internal on public.workflow_logs;
create policy workflow_logs_write_internal on public.workflow_logs
for all to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user())
with check ("organizationId" = app.current_organization_id() and app.is_internal_user());
