# Roadmap — état d’avancement produit & technique

Document de suivi **versionné** : à **mettre à jour à chaque livraison notable** (features, migrations, sécurité, infra). En session agent, modifier ce fichier lorsqu’un lot ci‑dessous change de statut.

**LMS (learning / formation opérationnelle)** : la **plateforme LMS** (contenus, apprenants, expérience cours) **n’est pas développée dans ce dépôt**. En **second temps**, ce CRM pourra toutefois exposer ou consommer un **lien de communication** avec une LMS **externe** (événements signés, webhooks sortants, réception de callbacks, identifiants externes dans les données) — sans porter la logique métier ni l’UI du LMS ici.

| Méta | Valeur |
|------|--------|
| **Dernière mise à jour** | 2026-05-19 |
| **Réf. produit** | [cahier-des-charges-gem-cursor-mai-2026.md](./cahier-des-charges-gem-cursor-mai-2026.md), [crm-saas-plan-architecture-et-implementation.md](./crm-saas-plan-architecture-et-implementation.md) |

---

## Livré (consolidé dans le dépôt)

| Lot | Thème | Détail |
|-----|-------|--------|
| **A1** | Sécurité / multi-tenant | RLS étendue (templates devis/contrats, dossiers, etc.) ; secret callback signature externe si configuré ; merge `app_metadata` rôle Supabase sans écraser `organization_id` ; garde rôles sur documents internes. |
| **B2** | Templates projet / phases | `ProjectTemplate`, `ProjectTemplatePhase`, migrations, module API ; tunnel contrat → instanciation alignée sur gabarits. |
| **B3** | Onboarding projet | Checklist / jalons enrichis sur la fiche projet interne. |
| **B1** | Notifications temps réel | Publication Realtime table `notifications` ; `GET /users/me` ; topbar : subscription + toasts + invalidation React Query. |
| **B4** | Tickets support | Modèle `tickets`, migration + RLS ; API `/tickets` ; portail `/client/tickets` ; UI interne `/tickets` ; notifications `ticket_created` / `ticket_assigned`. |
| **B4+** | Tickets enrichis | Fil `ticket_comments` ; pièces jointes via `documents.ticketId` ; SLA (`slaDueAt` par priorité, `firstResponseAt` au 1er commentaire interne) ; notif équipe (`admin`+`member`) à la création portail ; type `ticket_comment` ; endpoints `POST …/comments` & `…/attachments` (interne + portail). |
| **C1** | KPI & exports CSV | `GET /organizations/stats` enrichi (pipeline non terminé, tickets ouverts/en cours, répartition par étape deal) ; exports UTF‑8 BOM `GET /organizations/export/{deals,contacts,projects,tickets}` (rôles admin/member) ; UI tableau de bord : cartes + bandeau pipeline + téléchargements CSV. |
| **P3** | Docs & activité (MVP) | `/documents` (hub) avec contexte deal / projet / contact / entreprise / ticket ; `GET /documents?ticketId=…` ; timeline « Activité & historique » (interactions + documents) sur fiches deal et projet ; invalidations React Query croisées liste ↔ timeline. |
| **P4** | Automations (tranche 1) | Passage deal → `won` : création idempotente projet `tunnel_onboarding` + instanciation phases (modèle org ou défauts) ; webhook sortant optionnel `deal.won` configurable (`dealWonWebhookUrl` / `dealWonWebhookSecret`). |
| — | Session navigateur | Timeout d’inactivité + doc `NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MS`. |
| — | Ops / qualité | CI GitHub Actions ; ESLint/Jest API ; scripts utilitaires ; Dockerfiles ; [CONFIGURATION_ENVIRONNEMENT.md](./CONFIGURATION_ENVIRONNEMENT.md) (Prisma, ports Windows, EPERM). |

---

## Partiellement fait / à pérenniser

| Sujet | État | Suite |
|-------|------|--------|
| **RLS PostgreSQL** | **Audit exhaustif complété (2026-05-19)** — 23 tables auditées ; 2 failles corrigées (`accounts_select_org` trop permissif côté client ; sous-SELECT `tasks`/phases sans garde `organizationId`) ; hardening `IS NOT NULL` sur `contactId` client pour deals/quotes/contracts/projects/project_phases ; storage bucket `exports` ajouté au fichier SQL Supabase Storage. | Relancer l'audit à chaque nouveau modèle. |
| **Notifications** | CRUD + temps réel pour les lignes concernées | Préférences utilisateur, sonnerie, autres tables si besoin ; mettre à jour la ligne ci‑dessus quand le périmètre est figé. |
| **Tunnel Devis → Contrat** | Flux principal en place | Variantes métier (ex. acceptation devis côté portail) ; synchroniser avec la doc produit. |
| **Automations (P4)** | Éditeur no-code de création **et d’édition** des conditions (incl. règles existantes) + templates installables (`provider-defaults`, `deal-won-defaults`) | Versionner davantage les contrats d’événements d’intégration externes. |
| **Recherche & thème** | API + UI partielle | Recherche globale poussée, dark mode (`next-themes`), filtres avancés si retenus. |
| **C1+** | Dashboard : périodes `from`/`to`, préréglages, graphe par étape, série **activité deals** (jour / semaine UTC) + CA clôturé | Exports CSV planifiés, KPI hors deals, autres graphiques métier. |
| **B4++** | SLA première réponse **paramétrable** ; SLA **résolution** (`resolutionSlaDueAt`, `settings.ticketResolutionSlaHours`) ; **quotas PJ ticket** ; **mentions `@email`** dans les commentaires (notif `mention`, auteurs internes) | Gardes‑fous storage ; durcissements ticket si besoin. **Interop LMS** : phase ultérieure (voir backlog **P6**). |
| **Production** | **Hardening livré (2026-05-19)** — `output: standalone` Next.js ; Dockerfiles multi-stage monorepo (contexte racine) ; `docker-compose.prod.yml` (Redis auth, healthcheck, service migration isolé) ; workflow release CI (quality → migrate → build/push GHCR → GitHub Release) ; guide [`DEPLOIEMENT.md`](./DEPLOIEMENT.md) complet ; `.env.example` bucket `exports`. | Décommenter le bloc de déploiement (Railway / Render / VPS) dans `release.yml` selon la plateforme cible. |

---

## À faire (backlog priorisé)

| Priorité | Id | Contenu indicatif |
|----------|-----|-------------------|
| **P1** | **C1+** | Exports CSV planifiés / automatisés, KPI additionnels, drill-down dashboard. *(Tranche 8 livrée : drill-down bucket sur graphe activité tickets)* |
| **P2** | **B4++** | **Clôturé sur ce dépôt** — SLA 1ʳᵉ réponse + SLA résolution + quotas PJ + mentions `@email` (fonctionnalités tickets avancées ; **pas** de code produit LMS). |
| **P3** | **Docs & activité (suite)** | Prévisualisation, versioning, quotas, filtres métier poussés, recherche full‑text ou index dédié. *(Tranche 2 livrée : recherche serveur + filtres avancés centre documentaire ; Tranche 3 livrée : prévisualisation inline PDF/image sur centre documentaire interne + portail client)* |
| **P4** | **Automations** | Étendre les règles fines `won` → projet/onboarding (templates, conditions), industrialiser les **webhooks / événements** réutilisables pour intégrations externes — **y compris** le futur lien CRM ↔ LMS (sans héberger le LMS). *(Tranche 3 livrée : moteur conditions no-code + éditeur visuel de conditions ; Tranche 4 livrée : édition des conditions des règles existantes + templates `deal.won`)* |
| **P5** | **i18n / devises** | Base FR → EN ; EUR / USD / XOF homogènes UI + données. *(Tranche 1 livrée : devises supportées validées API + préférences tenant `defaultCurrency/defaultLocale` + helpers formatage locale/devise côté web)* |
| **P6** | **Interop LMS (phase 2)** | **Lien de communication** avec une LMS **hébergée ailleurs** : contrat d’événements (ex. contrat signé, projet prêt), secrets partagés, endpoints d’émission / réception, champs `externalId` ou équivalent où utile. **Ne pas** développer le produit LMS dans ce repo. |

---

## Historique des mises à jour (raccourci)

| Date | Changement principal |
|------|----------------------|
| 2026-05-13 | Création du document : état post A1, B1–B4, session, CI, doc Prisma ; backlog C1+. |
| 2026-05-13 | **Périmètre LMS** : pas de **produit** LMS dans ce dépôt ; **phase 2** = lien de communication CRM ↔ LMS externe (interop), à traiter sous **P6**. |
| 2026-05-13 | Livraison **C1** : stats dashboard étendues, exports CSV organisation, composant exports sur `/dashboard`. |
| 2026-05-13 | Livraison **B4+** : commentaires & PJ tickets, SLA première réponse, notifications équipe complète sur ticket portail. |
| 2026-05-13 | Livraison **P3** (MVP) : hub documentaire enrichi, filtre API `ticketId`, timeline activité deal/projet. |
| 2026-05-13 | **C1+** (tranche 1) : stats dashboard filtrées par `from`/`to`, préréglages et graphe étapes sur `/dashboard`. |
| 2026-05-13 | **C1+** (tranche 2) : champ `dealActivitySeries` dans `GET /organizations/stats` + graphique activité deals / CA sur `/dashboard`. |
| 2026-05-13 | **B4++** (SLA) : `ticketSlaHours` dans `settings` org + formulaire Réglages + recalcul `slaDueAt` sur priorité. |
| 2026-05-13 | **B4++** (SLA résolution) : champ `resolutionSlaDueAt`, `settings.ticketResolutionSlaHours`, formulaire Réglages, UI ticket interne + portail, export CSV. |
| 2026-05-13 | **B4++** (mentions ticket) : `@email` dans les commentaires → notif `mention` ; surbrillance UI ; auteurs internes uniquement. |
| 2026-05-18 | **P4 (tranche 1)** : passage deal en `won` => création idempotente projet onboarding + phases ; ajout webhook sortant configurable `deal.won` (`dealWonWebhookUrl` / `dealWonWebhookSecret`). |
| 2026-05-18 | **C1+ (tranche 3)** : exports CSV planifiés (scheduler horaire piloté par `settings.scheduledExports`), endpoint `run-now`, listing des derniers exports planifiés, stockage en `documents`. |
| 2026-05-18 | **C1+ (tranche 4)** : exports planifiés avec période configurable (`scheduledExports.periodDays` ou `from`/`to`) + run manuel avec plage explicite ; métadonnées de période renvoyées dans le listing. |
| 2026-05-18 | **C1+ (tranche 5)** : drill-down KPI (`GET /organizations/stats/drilldown`) pour contacts, pipeline, conversion, projets, tâches actives, CA, tickets actifs ; rendu de détail dans `/dashboard`. |
| 2026-05-18 | **C1+ (tranche 6)** : drill-down dashboard actionnable (colonne `action` + liens directs vers fiches contact/deal/projet/tâche/ticket). |
| 2026-05-18 | **C1+ (tranche 7)** : `ticketActivitySeries` dans `GET /organizations/stats` + graphe activité tickets (créés/résolus/fermés) sur `/dashboard` en vue période. |
| 2026-05-18 | **C1+ (tranche 8)** : endpoint bucket tickets `GET /organizations/stats/tickets-activity-drilldown` + clic sur barres du graphe tickets pour ouvrir la liste détaillée des tickets du bucket. |
| 2026-05-19 | **P4 (tranche 2)** : évaluation des `conditions` d’automations (eq/neq/contains/comparateurs/in/exists) avant exécution/queue ; logs `skipped` ; ajout saisie JSON des conditions dans l’UI Automatisations. |
| 2026-05-19 | **P4 (tranche 3)** : remplacement de la saisie JSON brute par un éditeur visuel de conditions (path/op/value) avec suppression unitaire ; conversion automatique vers payload conditions API. |
| 2026-05-19 | **P4 (tranche 4)** : édition des conditions de règles existantes dans l’UI Automatisations + endpoint/templates `deal-won-defaults` (playbooks métier selon `offerType`). |
| 2026-05-19 | **P5 (tranche 1)** : validation API des devises (`EUR`,`USD`,`XOF`) sur deals/devis/contrats ; réglages organisation `defaultCurrency` + `defaultLocale` ; formatage web montants/dates piloté par ces préférences. |
| 2026-05-19 | **RLS audit** : passe exhaustive (23 tables) ; migration `20260519000000_rls_audit_corrections` — correction `accounts` client (accès entreprises restreint au compte du contact) ; hardening `tasks`/phases/deals/quotes/contracts/projects (guard `organizationId` + `IS NOT NULL` sur `contactId`) ; bucket `exports` dans `supabase-storage-documents-rls.sql`. |
| 2026-05-19 | **Production hardening** : `output: standalone` Next.js ; Dockerfiles multi-stage monorepo (contexte racine, user non-root, Alpine) ; `docker-compose.prod.yml` (Redis auth, healthcheck, service `api-migrate`) ; `release.yml` CI/CD (quality → migrate → push GHCR → GitHub Release) ; `docs/DEPLOIEMENT.md` + checklist ; `.env.example` (`exports` bucket, Redis prod). |
| 2026-05-19 | **P3 (tranche 3)** : prévisualisation inline des documents (`image/*`, `application/pdf`) sur le centre documentaire interne et le portail client, avec fallback d’ouverture/téléchargement pour les types non supportés. |
| 2026-05-18 | **P3 (tranche 2)** : `GET /documents` étendu (recherche `q`, `linkedTo`, `mimePrefix`, `from/to`, `sort`) + UI centre documentaire avec filtres avancés côté serveur. |

---

*Pour l’agent ou l’équipe : après chaque merge significatif, ajuster les tableaux, incrémenter **Dernière mise à jour**, et ajouter une ligne à **Historique**. **Ne pas** développer le **produit** LMS ici ; les travaux **interop** (P6) concernent uniquement les **canaux** entre ce CRM et une LMS externe.*
