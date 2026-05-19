-- ============================================================
-- Audit RLS exhaustif — corrections 2026-05-19
--
-- Résumé des tables auditées (toutes ont RLS activé) :
--   organizations             ✅ select/update propres
--   users                     ✅ select interne + client self, update self
--   accounts                  ⚠️ CORRIGÉ : select trop large (client voyait tout)
--   contacts                  ✅
--   deals                     ✅
--   quotes                    ✅
--   contracts                 ✅
--   contract_folders          ✅ interne uniquement
--   contract_templates        ✅ interne uniquement
--   quote_templates           ✅ interne uniquement
--   projects                  ✅
--   project_phases            ✅
--   project_templates         ✅ interne uniquement
--   project_template_phases   ✅ interne uniquement
--   tasks                     ⚠️ CORRIGÉ : sous-SELECT client sans garde organizationId
--   tickets                   ✅ select + insert client
--   ticket_comments           ✅ select + insert client
--   interactions              ✅
--   documents                 ✅ select + insert client (ticket)
--   notifications             ✅ own-only
--   messages                  ✅ own sender/recipient
--   automation_rules          ✅ interne uniquement
--   workflow_logs             ✅ interne uniquement
-- ============================================================

-- ============================================================
-- 1. accounts — séparer le SELECT interne du SELECT client
-- ============================================================
-- La politique précédente accordait le SELECT à TOUS les utilisateurs
-- authentifiés de l'org (y compris les clients), leur permettant de voir
-- toutes les entreprises. On remplace par deux politiques distinctes.

DROP POLICY IF EXISTS accounts_select_org ON public.accounts;
DROP POLICY IF EXISTS accounts_select_internal ON public.accounts;
DROP POLICY IF EXISTS accounts_select_client ON public.accounts;

-- Utilisateurs internes : accès complet à toutes les entreprises de l'org.
CREATE POLICY accounts_select_internal ON public.accounts
FOR SELECT TO authenticated
USING (
  "organizationId" = app.current_organization_id()
  AND app.is_internal_user()
);

-- Utilisateurs clients : accès uniquement à l'entreprise liée à leur contact.
CREATE POLICY accounts_select_client ON public.accounts
FOR SELECT TO authenticated
USING (
  "organizationId" = app.current_organization_id()
  AND app.current_user_role() = 'client'
  AND id IN (
    SELECT c."accountId"
    FROM public.contacts c
    WHERE c.id       = app.current_contact_id()
      AND c."accountId"      IS NOT NULL
      AND c."organizationId" = app.current_organization_id()
  )
);

-- ============================================================
-- 2. tasks — renforcer la garde cross-tenant dans le SELECT client
-- ============================================================
-- La politique précédente vérifiait uniquement p."contactId" dans le
-- sous-SELECT sans confirmer p."organizationId". Cela crée une faille
-- théorique cross-tenant si un attaquant pouvait influencer les IDs.

DROP POLICY IF EXISTS tasks_select_client ON public.tasks;

CREATE POLICY tasks_select_client ON public.tasks
FOR SELECT TO authenticated
USING (
  "organizationId" = app.current_organization_id()
  AND app.current_user_role() = 'client'
  AND "projectId" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id             = tasks."projectId"
      AND p."organizationId" = app.current_organization_id()
      AND p."contactId"      = app.current_contact_id()
  )
);

-- ============================================================
-- 3. interactions — renforcer le SELECT client (même correction)
-- ============================================================
-- Ajout du guard organizationId sur la condition contactId.

DROP POLICY IF EXISTS interactions_select_client ON public.interactions;

CREATE POLICY interactions_select_client ON public.interactions
FOR SELECT TO authenticated
USING (
  "organizationId" = app.current_organization_id()
  AND app.current_user_role() = 'client'
  AND "contactId" IS NOT NULL
  AND "contactId" = app.current_contact_id()
);

-- ============================================================
-- 4. deals — préciser IS NOT NULL sur contactId client
-- ============================================================
DROP POLICY IF EXISTS deals_select_client ON public.deals;

CREATE POLICY deals_select_client ON public.deals
FOR SELECT TO authenticated
USING (
  "organizationId" = app.current_organization_id()
  AND app.current_user_role() = 'client'
  AND "contactId" IS NOT NULL
  AND "contactId" = app.current_contact_id()
);

-- ============================================================
-- 5. quotes — préciser IS NOT NULL sur contactId client
-- ============================================================
DROP POLICY IF EXISTS quotes_select_client ON public.quotes;

CREATE POLICY quotes_select_client ON public.quotes
FOR SELECT TO authenticated
USING (
  "organizationId" = app.current_organization_id()
  AND app.current_user_role() = 'client'
  AND "contactId" IS NOT NULL
  AND "contactId" = app.current_contact_id()
);

-- ============================================================
-- 6. contracts — préciser IS NOT NULL sur contactId client
-- ============================================================
DROP POLICY IF EXISTS contracts_select_client ON public.contracts;

CREATE POLICY contracts_select_client ON public.contracts
FOR SELECT TO authenticated
USING (
  "organizationId" = app.current_organization_id()
  AND app.current_user_role() = 'client'
  AND "contactId" IS NOT NULL
  AND "contactId" = app.current_contact_id()
);

-- ============================================================
-- 7. projects — préciser IS NOT NULL sur contactId client
-- ============================================================
DROP POLICY IF EXISTS projects_select_client ON public.projects;

CREATE POLICY projects_select_client ON public.projects
FOR SELECT TO authenticated
USING (
  "organizationId" = app.current_organization_id()
  AND app.current_user_role() = 'client'
  AND "contactId" IS NOT NULL
  AND "contactId" = app.current_contact_id()
);

-- ============================================================
-- 8. project_phases — renforcer guard organizationId dans subquery client
-- ============================================================
DROP POLICY IF EXISTS project_phases_select_client ON public.project_phases;

CREATE POLICY project_phases_select_client ON public.project_phases
FOR SELECT TO authenticated
USING (
  app.current_user_role() = 'client'
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id             = project_phases."projectId"
      AND p."organizationId" = app.current_organization_id()
      AND p."contactId"      IS NOT NULL
      AND p."contactId"      = app.current_contact_id()
  )
);
