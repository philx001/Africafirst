-- Persistent project/phase templates.
-- Generated project phases remain snapshots: editing a template does not mutate existing projects.

create table public.project_templates (
  id text primary key,
  key text not null,
  name text not null,
  description text,
  "offerType" public."OfferType" not null default 'generic',
  "isDefault" boolean not null default false,
  "isActive" boolean not null default true,
  metadata jsonb not null default '{}',
  "createdAt" timestamp(3) without time zone not null default current_timestamp,
  "updatedAt" timestamp(3) without time zone not null,
  "organizationId" text not null,
  constraint project_templates_organizationId_fkey
    foreign key ("organizationId") references public.organizations(id) on delete cascade on update cascade
);

create table public.project_template_phases (
  id text primary key,
  key text not null,
  label text not null,
  description text,
  "sortOrder" integer not null default 0,
  "isRequired" boolean not null default false,
  "defaultStatus" public."ProjectPhaseStatus" not null default 'pending',
  "targetDelayDays" integer,
  gate jsonb not null default '{}',
  deliverables jsonb not null default '[]',
  metadata jsonb not null default '{}',
  "createdAt" timestamp(3) without time zone not null default current_timestamp,
  "updatedAt" timestamp(3) without time zone not null,
  "templateId" text not null,
  constraint project_template_phases_templateId_fkey
    foreign key ("templateId") references public.project_templates(id) on delete cascade on update cascade
);

alter table public.projects
  add column "templateId" text;

alter table public.projects
  add constraint projects_templateId_fkey
  foreign key ("templateId") references public.project_templates(id) on delete set null on update cascade;

alter table public.project_phases
  add column "statusReason" text,
  add column "resolvedAt" timestamp(3) without time zone,
  add column "templatePhaseId" text;

alter table public.project_phases
  add constraint project_phases_templatePhaseId_fkey
  foreign key ("templatePhaseId") references public.project_template_phases(id) on delete set null on update cascade;

create unique index project_templates_organizationId_key_key
  on public.project_templates ("organizationId", key);
create index project_templates_organizationId_offerType_isActive_idx
  on public.project_templates ("organizationId", "offerType", "isActive");
create unique index project_template_phases_templateId_key_key
  on public.project_template_phases ("templateId", key);
create index project_template_phases_templateId_sortOrder_idx
  on public.project_template_phases ("templateId", "sortOrder");
create index projects_templateId_idx
  on public.projects ("templateId");
create index project_phases_templatePhaseId_idx
  on public.project_phases ("templatePhaseId");

alter table public.project_templates enable row level security;
alter table public.project_template_phases enable row level security;

drop policy if exists project_templates_select_internal on public.project_templates;
create policy project_templates_select_internal on public.project_templates
for select to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists project_templates_write_internal on public.project_templates;
create policy project_templates_write_internal on public.project_templates
for all to authenticated
using ("organizationId" = app.current_organization_id() and app.is_internal_user())
with check ("organizationId" = app.current_organization_id() and app.is_internal_user());

drop policy if exists project_template_phases_select_internal on public.project_template_phases;
create policy project_template_phases_select_internal on public.project_template_phases
for select to authenticated
using (
  exists (
    select 1
    from public.project_templates t
    where t.id = project_template_phases."templateId"
      and t."organizationId" = app.current_organization_id()
      and app.is_internal_user()
  )
);

drop policy if exists project_template_phases_write_internal on public.project_template_phases;
create policy project_template_phases_write_internal on public.project_template_phases
for all to authenticated
using (
  exists (
    select 1
    from public.project_templates t
    where t.id = project_template_phases."templateId"
      and t."organizationId" = app.current_organization_id()
      and app.is_internal_user()
  )
)
with check (
  exists (
    select 1
    from public.project_templates t
    where t.id = project_template_phases."templateId"
      and t."organizationId" = app.current_organization_id()
      and app.is_internal_user()
  )
);
