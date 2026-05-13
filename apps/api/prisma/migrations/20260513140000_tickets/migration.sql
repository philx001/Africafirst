-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- AlterEnum (valeurs pour notifications)
ALTER TYPE "NotificationType" ADD VALUE 'ticket_created';
ALTER TYPE "NotificationType" ADD VALUE 'ticket_assigned';

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "ticketNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'open',
    "priority" "Priority" NOT NULL DEFAULT 'medium',
    "category" TEXT NOT NULL DEFAULT 'support',
    "organizationId" TEXT NOT NULL,
    "contactId" TEXT,
    "projectId" TEXT,
    "accountId" TEXT,
    "assigneeId" TEXT,
    "createdById" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tickets_organizationId_ticketNumber_key" ON "tickets"("organizationId", "ticketNumber");

CREATE INDEX "tickets_organizationId_idx" ON "tickets"("organizationId");

CREATE INDEX "tickets_contactId_idx" ON "tickets"("contactId");

CREATE INDEX "tickets_projectId_idx" ON "tickets"("projectId");

CREATE INDEX "tickets_accountId_idx" ON "tickets"("accountId");

CREATE INDEX "tickets_status_organizationId_idx" ON "tickets"("status", "organizationId");

CREATE INDEX "tickets_assigneeId_idx" ON "tickets"("assigneeId");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS (aligné sur le multi-tenant existant)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tickets_select_internal ON public.tickets;
CREATE POLICY tickets_select_internal ON public.tickets
FOR SELECT TO authenticated
USING ("organizationId" = app.current_organization_id() AND app.is_internal_user());

DROP POLICY IF EXISTS tickets_write_internal ON public.tickets;
CREATE POLICY tickets_write_internal ON public.tickets
FOR ALL TO authenticated
USING ("organizationId" = app.current_organization_id() AND app.is_internal_user())
WITH CHECK ("organizationId" = app.current_organization_id() AND app.is_internal_user());

DROP POLICY IF EXISTS tickets_select_client ON public.tickets;
CREATE POLICY tickets_select_client ON public.tickets
FOR SELECT TO authenticated
USING (
  "organizationId" = app.current_organization_id()
  AND app.current_user_role() = 'client'
  AND "contactId" IS NOT NULL
  AND "contactId" = app.current_contact_id()
);

DROP POLICY IF EXISTS tickets_insert_client ON public.tickets;
CREATE POLICY tickets_insert_client ON public.tickets
FOR INSERT TO authenticated
WITH CHECK (
  "organizationId" = app.current_organization_id()
  AND app.current_user_role() = 'client'
  AND "contactId" = app.current_contact_id()
  AND "createdById" IN (
    SELECT u.id FROM public.users u
    WHERE u."organizationId" = app.current_organization_id()
      AND u."contactId" = app.current_contact_id()
  )
);
