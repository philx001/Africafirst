-- B4+: SLA premier réponse, fil de discussion (ticket_comments), pièces jointes (documents.ticketId)

ALTER TYPE "NotificationType" ADD VALUE 'ticket_comment';

ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "slaDueAt" TIMESTAMP(3);

ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "firstResponseAt" TIMESTAMP(3);

CREATE TABLE "ticket_comments" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ticket_comments_organizationId_idx" ON "ticket_comments"("organizationId");

CREATE INDEX "ticket_comments_ticketId_idx" ON "ticket_comments"("ticketId");

CREATE INDEX "ticket_comments_authorId_idx" ON "ticket_comments"("authorId");

ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "ticketId" TEXT;

CREATE INDEX IF NOT EXISTS "documents_ticketId_idx" ON "documents"("ticketId");

ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_ticketId_fkey";

ALTER TABLE "documents" ADD CONSTRAINT "documents_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "tickets"
SET "slaDueAt" = CASE "priority"::text
  WHEN 'urgent' THEN "createdAt" + INTERVAL '4 hours'
  WHEN 'high' THEN "createdAt" + INTERVAL '8 hours'
  WHEN 'medium' THEN "createdAt" + INTERVAL '24 hours'
  WHEN 'low' THEN "createdAt" + INTERVAL '48 hours'
  ELSE "createdAt" + INTERVAL '24 hours'
END
WHERE "slaDueAt" IS NULL;

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket_comments_select_internal ON public.ticket_comments;

CREATE POLICY ticket_comments_select_internal ON public.ticket_comments
FOR SELECT TO authenticated
USING ("organizationId" = app.current_organization_id() AND app.is_internal_user());

DROP POLICY IF EXISTS ticket_comments_write_internal ON public.ticket_comments;

CREATE POLICY ticket_comments_write_internal ON public.ticket_comments
FOR ALL TO authenticated
USING ("organizationId" = app.current_organization_id() AND app.is_internal_user())
WITH CHECK ("organizationId" = app.current_organization_id() AND app.is_internal_user());

DROP POLICY IF EXISTS ticket_comments_select_client ON public.ticket_comments;

CREATE POLICY ticket_comments_select_client ON public.ticket_comments
FOR SELECT TO authenticated
USING (
  "organizationId" = app.current_organization_id()
  AND app.current_user_role() = 'client'
  AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_comments."ticketId"
      AND t."contactId" IS NOT NULL
      AND t."contactId" = app.current_contact_id()
  )
);

DROP POLICY IF EXISTS ticket_comments_insert_client ON public.ticket_comments;

CREATE POLICY ticket_comments_insert_client ON public.ticket_comments
FOR INSERT TO authenticated
WITH CHECK (
  "organizationId" = app.current_organization_id()
  AND app.current_user_role() = 'client'
  AND "authorId" = app.current_user_id()
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = ticket_comments."authorId"
      AND u."organizationId" = app.current_organization_id()
      AND u."contactId" = app.current_contact_id()
  )
  AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_comments."ticketId"
      AND t."organizationId" = app.current_organization_id()
      AND t."contactId" = app.current_contact_id()
  )
);

DROP POLICY IF EXISTS documents_select_client ON public.documents;

CREATE POLICY documents_select_client ON public.documents
FOR SELECT TO authenticated
USING (
  "organizationId" = app.current_organization_id()
  AND app.current_user_role() = 'client'
  AND (
    "contactId" = app.current_contact_id()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = documents."projectId"
        AND p."contactId" = app.current_contact_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = documents."dealId"
        AND d."contactId" = app.current_contact_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = documents."ticketId"
        AND t."contactId" = app.current_contact_id()
    )
  )
);

DROP POLICY IF EXISTS documents_insert_client_ticket ON public.documents;

CREATE POLICY documents_insert_client_ticket ON public.documents
FOR INSERT TO authenticated
WITH CHECK (
  "organizationId" = app.current_organization_id()
  AND app.current_user_role() = 'client'
  AND "ticketId" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = documents."ticketId"
      AND t."organizationId" = app.current_organization_id()
      AND t."contactId" = app.current_contact_id()
  )
);
