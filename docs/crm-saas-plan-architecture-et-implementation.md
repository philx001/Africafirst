---
name: CRM SaaS Full Stack
overview: Build a full-stack CRM SaaS application from scratch with NestJS backend, Next.js frontend, Supabase (PostgreSQL + Auth + Realtime), Redis (BullMQ), et architecture multi-tenant — conçu pour usage interne en Phase 1 et SaaS scalable en Phase 2/3.
todos:
  - id: monorepo-scaffold
    content: Initialize Turborepo monorepo with apps/api (NestJS), apps/web (Next.js), packages/shared
    status: completed
  - id: docker-setup
    content: Create docker-compose.yml with Redis + MinIO only (Supabase remplace PostgreSQL local), .env.example avec variables Supabase
    status: completed
  - id: prisma-schema
    content: Write complete Prisma schema with all models (organization_id on every table, indexes, FK relations)
    status: completed
  - id: nestjs-auth
    content: Implement AuthModule avec Supabase Auth (JWT Supabase, @supabase/ssr, rate limiting NestJS Throttler, TenantGuard)
    status: completed
  - id: nestjs-crm-modules
    content: Implement Contacts, Accounts, Deals, Interactions NestJS modules with multi-tenant filtering
    status: completed
  - id: nestjs-projects-tasks
    content: Implement Projects, Tasks (with sub-tasks) NestJS modules
    status: completed
  - id: nestjs-documents
    content: Documents module — upload/download via Supabase Storage (URL signées), métadonnées Prisma
    status: completed
  - id: nestjs-notifications
    content: Notifications API (CRUD, lu/non-lu) ; temps réel Supabase Realtime ou UI polling à finaliser
    status: in_progress
  - id: nestjs-automations
    content: Implement AutomationsModule with BullMQ workers and webhook dispatcher
    status: completed
  - id: nestjs-client-portal
    content: Implement ClientPortalModule with contact-scoped guards and isolated routes
    status: completed
  - id: nextjs-auth-layout
    content: Next.js login/register, middleware, layout interne — peaufiner UX (shadcn) et routes manquantes
    status: in_progress
  - id: nextjs-crm-views
    content: "Vues internes CRM : dashboard, contacts, deals ; ajouter accounts, documents, recherche UI"
    status: in_progress
  - id: nextjs-projects-views
    content: "Projets internes ; compléter tâches Kanban/calendrier, sous-tâches — pages /tasks si absentes"
    status: in_progress
  - id: nextjs-client-portal
    content: "Build client portal pages: dashboard, projects, documents, messaging, notifications"
    status: completed
  - id: swagger-docs
    content: Add Swagger decorators to all NestJS controllers, generate /api/docs endpoint
    status: completed
  - id: global-search-dark-mode
    content: Recherche globale (API OK) — UI globale, dark mode (next-themes), filtres avancés
    status: in_progress
  - id: production-config
    content: Production Dockerfiles (API + web), CORS/Helmet, durcissement, docs déploiement
    status: in_progress
  - id: tunnel-contractuel-onboarding
    content: "Métier : Devis → Contrat → Signature ; type d’offre ; onboarding ; templates phases (skipped OK)"
    status: completed
  - id: supabase-rls-policies
    content: Politiques RLS Supabase par organization_id (alignées JWT / Prisma)
    status: pending
isProject: false
---

> **Copie de référence dans le dépôt** — Document initialement généré comme plan Cursor (`crm_saas_full_stack_d43fec3a.plan.md` dans le dossier utilisateur `.cursor/plans/`). Si le plan évolue dans Cursor, reporter ici les changements utiles pour garder une source unique versionnée avec le code.

---

## Mise à jour mai 2026 — Plan d’implémentation ajusté

### Principes métier validés

- **Phases du référentiel** (IA, onboarding, etc.) : **sautables** ; le produit doit s’appuyer sur des **phases instanciées** ou des statuts du type `skipped` / `not_applicable`, et non sur une séquence obligatoire en dur — voir [reference-phases-types-programmes-crm.md](./reference-phases-types-programmes-crm.md) §1.1.
- **Formation (admin)** et **programmes IA** : couvrir en permanence **gestion commerciale** (comptes, contacts, deals, signature) **et** **gestion de projet / onboarding** (projets, tâches, jalons) — voir même document §1.2.

### Inventaire rapide (état du dépôt)

| Domaine | En place | À faire / consolider |
|--------|----------|----------------------|
| Fondations | Turborepo, Auth Supabase, Prisma multi-tenant, Redis, Workers | **RLS** PostgreSQL (Supabase) par `organization_id` |
| API | Contacts, Accounts, Deals, Projects, Tasks, Interactions, **Documents** (Supabase Storage), **Search**, Notifications (CRUD), Automations, Webhooks, Client portal | Notifications **temps réel** ou UX synchronisée ; règles `won` → projet / onboarding |
| **Tunnel Devis → Contrat → Signature** | Modèle `Quote`, `Contract`, UI tunnel sur fiche deal (`/deals/[id]`), portail signature, `ensureTunnelOnboardingProject` après signature (projet + phases) | Variante « portail client accepte devis » ; webhooks / notifs temps réel ; aligner doc produit si besoin |
| **Types d’offre** & **templates de phases** | Générique (tags, projets) | Champs ou référentiel ; génération tâches depuis bibliothèque ([noyau MVP §6](./reference-phases-types-programmes-crm.md)) ; sauts sans casser le flux |
| UI interne | Dashboard, Contacts, Pipeline deals, Projets | Pages **Entreprises** (`/accounts`), **Tâches** (`/tasks`), **Automatisations**, **Paramètres** — aujourd’hui référencées par la **sidebar** mais **sans** `page.tsx` correspondant ; vues **Documents** / **Interactions** internes ; barre de **recherche** branchée sur `/search` |
| UI portail client | Projets, documents, messages, dashboard | Étendre pour signatures / documents contractuels |
| Ops | Swagger, logging Winston, Dockerfile API | Dockerfile **web**, durcissement CORS/Helmet, jeux de tests ciblés |

### Ordre de travail recommandé

1. **Cohérence navigation** : implémenter ou désactiver les entrées de menu vers `/accounts`, `/tasks`, `/automations`, `/settings`.
2. **Tunnel contractuel** : devis / contrat / signature + stockage + notifications + webhook « contrat signé » (préparation LMS).
3. **Métier delivery** : type d’offre (`formation_admin`, `conseil_ia`, …) ; **onboarding** ; application de **modèles** de tâches avec phases **optionnelles** / sautées.
4. **Documents & activité** : centre documentaire interne ; timeline interactions liée aux deals/projets.
5. **Recherche & notifications** : UI globale ; raffinements temps réel.
6. **LMS** : événements et clés externes (phase ultérieure).

### Références produit

[cahier-des-charges-perso-mai-2026.md](./cahier-des-charges-perso-mai-2026.md) · [cahier-des-charges-gem-cursor-mai-2026.md](./cahier-des-charges-gem-cursor-mai-2026.md) · [reference-phases-types-programmes-crm.md](./reference-phases-types-programmes-crm.md)

---

# CRM SaaS — Plan d'Architecture & Implémentation

## Structure du Monorepo

```
crm-africafirst/
├── apps/
│   ├── api/          # Backend NestJS
│   └── web/          # Frontend Next.js 14
├── packages/
│   └── shared/       # Types TS, DTOs, constantes partagés
├── docker-compose.yml # Redis + MinIO uniquement
├── .env.example
└── turbo.json        # Orchestration Turborepo
```

## Choix Techniques

- **Monorepo** : Turborepo (rapide, zéro config)
- **Base de données** : Supabase (PostgreSQL managé, Auth intégrée, Realtime natif)
- **ORM** : Prisma (type-safe, migrations, connecté à Supabase via DATABASE_URL)
- **Queue** : BullMQ + Redis (automations, jobs asynchrones)
- **Real-time** : Supabase Realtime (notifications) — Socket.IO en fallback si besoin
- **Auth** : Supabase Auth + `@supabase/ssr` côté Next.js + vérification JWT côté NestJS
- **Stockage documents** : Supabase Storage (S3-compatible, déjà inclus dans le projet)
- **API Docs** : Swagger (auto-généré depuis les décorateurs NestJS)

---

## Pourquoi Supabase change l'architecture (points clés)

- **Pas de PostgreSQL local** : Supabase fournit le PostgreSQL managé — `docker-compose.yml` ne contient que Redis + MinIO
- **Auth déléguée** : Supabase Auth gère inscription/connexion/refresh tokens. NestJS vérifie le JWT Supabase via `SUPABASE_JWT_SECRET`
- **Realtime natif** : Les notifications utilisent Supabase Realtime (WebSocket Postgres-based) plutôt que Socket.IO
- **Storage intégré** : Les documents sont stockés dans Supabase Storage (buckets S3-compatible) — MinIO reste en option self-hosted
- **Prisma + Supabase** : Prisma se connecte à la DB Supabase via `DATABASE_URL` (connection pooling via Supabase Pooler)

---

## Architecture Backend (`apps/api` — NestJS)

### Module Map

```mermaid
graph TD
    AuthModule --> UsersModule
    AuthModule --> OrgsModule["OrganizationsModule"]
    UsersModule --> OrgsModule
    ContactsModule --> OrgsModule
    AccountsModule --> OrgsModule
    DealsModule --> ContactsModule
    DealsModule --> AccountsModule
    ProjectsModule --> DealsModule
    TasksModule --> ProjectsModule
    InteractionsModule --> ContactsModule
    DocumentsModule --> OrgsModule
    NotificationsModule --> UsersModule
    AutomationsModule --> BullMQ["BullMQ / Redis"]
    ClientPortalModule --> ContactsModule
    ClientPortalModule --> ProjectsModule
    ClientPortalModule --> DocumentsModule
```

### Modules NestJS principaux

- `AuthModule` — vérification JWT Supabase, extraction `organization_id`, rate limiting (Throttler)
- `OrganizationsModule` — gestion des tenants, settings par org
- `UsersModule` — RBAC (admin/member/client), guards de rôles
- `ContactsModule` — CRUD contacts, recherche, tags
- `AccountsModule` — CRUD entreprises (accounts)
- `DealsModule` — étapes pipeline, kanban, cycle de vie deals
- `ProjectsModule` — CRUD projets, liés aux deals/contacts
- `TasksModule` — tâches + sous-tâches, assignees, dates d'échéance
- `InteractionsModule` — log emails, appels, réunions
- `DocumentsModule` — upload/download via Supabase Storage, métadonnées en DB
- `NotificationsModule` — Supabase Realtime pour les notifications temps réel
- `AutomationsModule` — moteur triggers/conditions/actions, workers BullMQ
- `ClientPortalModule` — routes isolées pour `role=client`, filtrées par `contact_id`
- `WebhooksModule` — dispatcher webhooks sortants (Make/n8n compatible)

### Guard Multi-Tenant (critique)

Chaque route protégée passe par un `TenantGuard` qui :
1. Vérifie et décode le JWT Supabase (via `SUPABASE_JWT_SECRET`)
2. Extrait `organization_id` du payload JWT
3. L'injecte dans chaque requête Prisma via un service request-scoped
4. Empêche toute fuite de données entre organisations

---

## Schéma de Données (Supabase PostgreSQL + Prisma)

Tous les modèles partagent ces champs de base :

```prisma
id             String   @id @default(cuid())
organizationId String
createdAt      DateTime @default(now())
updatedAt      DateTime @updatedAt
```

### Modèles principaux

- `Organization` — name, plan, settings, slug
- `User` — supabaseId (lien Supabase Auth), email, role (admin/member/client), organizationId, contactId (pour les clients)
- `Account` — raison sociale, secteur, site web, organizationId
- `Contact` — prénom, nom, email, téléphone, accountId, organizationId, tags[]
- `Deal` — titre, stage, valeur, contactId, accountId, organizationId, closedAt
- `Project` — nom, statut, dealId, contactId, organizationId, progression
- `Task` — titre, statut, parentTaskId (auto-relation), projectId, assigneeId, dueAt
- `Interaction` — type (email/appel/réunion), notes, contactId, dealId, organizationId
- `Document` — filename, mimeType, storagePath (Supabase Storage), contactId, projectId, organizationId
- `Notification` — userId, type, payload (JSON), readAt, organizationId
- `AutomationRule` — trigger (JSON), conditions (JSON), actions (JSON), organizationId, enabled
- `WorkflowLog` — ruleId, statut, input (JSON), output (JSON), organizationId

---

## Architecture Frontend (`apps/web` — Next.js 14)

### Groupes de Routes

```
app/
├── (auth)/
│   ├── login/
│   └── register/
├── (internal)/          # rôle : admin | member
│   ├── dashboard/
│   ├── contacts/
│   ├── accounts/
│   ├── deals/           # Kanban pipeline
│   ├── projects/
│   ├── tasks/
│   ├── automations/
│   └── settings/
└── (client)/            # rôle : client (portail)
    ├── dashboard/
    ├── projects/
    ├── documents/
    └── messages/
```

### Composants UI clés (shadcn/ui + Tailwind)

- `KanbanBoard` — drag & drop (dnd-kit) pour le pipeline deals et les tâches projets
- `DataTable` — pagination serveur, recherche, filtres (TanStack Table)
- `NotificationBell` — temps réel via Supabase Realtime, badge compteur
- `DocumentUploader` — sélecteur de fichier + barre de progression (Supabase Storage)
- `AutomationBuilder` — configurateur visuel trigger/action
- `CalendarView` — calendrier tâches et interactions (react-big-calendar)

---

## Docker Compose (simplifié grâce à Supabase)

Supabase étant managé en cloud, Docker Compose ne contient que les services locaux :

- `api` — NestJS (port 3001)
- `web` — Next.js (port 3000)
- `redis` — Redis 7 (port 6379, pour BullMQ)
- `minio` — Stockage objets local optionnel (ports 9000/9001) — peut être remplacé par Supabase Storage

---

## Phases d'Implémentation

### Phase 1 — Fondations (Semaines 1-2)
- Scaffold monorepo (Turborepo + types partagés)
- Connexion Supabase (DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET)
- Docker Compose : Redis + MinIO
- Schéma Prisma complet + migrations vers Supabase
- NestJS : AuthModule (vérification JWT Supabase, TenantGuard, rate limiting)
- Next.js : pages login/register avec `@supabase/ssr`, layout, routes protégées

### Phase 2 — CRM Core (Semaines 3-4)
- NestJS : modules Contacts, Accounts, Deals
- Frontend : liste/détail contacts, accounts, Kanban pipeline (dnd-kit)
- Log des interactions
- Dashboard avec métriques clés

### Phase 3 — Projets & Tâches (Semaines 5-6)
- NestJS : modules Projects, Tasks
- Frontend : liste projets, Kanban tâches, sous-tâches, calendrier
- Suivi temps (champs durée simples)

### Phase 4 — Portail Client (Semaine 7)
- `ClientPortalModule` avec guards isolés par contact_id
- Routes Next.js client avec données filtrées
- Upload/download documents via Supabase Storage
- Messagerie interne simple

### Phase 5 — Notifications & Automatisations (Semaines 8-9)
- Notifications temps réel via Supabase Realtime
- Workers BullMQ + moteur AutomationRule
- Dispatcher webhooks sortants (Make/n8n)
- Documentation Swagger API

### Phase 6 — Finitions & DevOps (Semaine 10)
- Recherche globale (PostgreSQL full-text via Supabase)
- Dark mode (Tailwind + next-themes)
- Tags & filtres avancés
- Logging (Winston + logs d'accès)
- Dockerfiles production
- README + documentation d'installation

---

## Checklist Sécurité

- JWT Supabase vérifié côté NestJS via `SUPABASE_JWT_SECRET` (RS256)
- `organization_id` injecté et validé sur chaque requête Prisma
- Throttler NestJS sur tous les endpoints auth (5 req/min)
- URLs Supabase Storage signées (time-limited) pour les documents
- Middleware Helmet (NestJS) — headers HTTP sécurisés
- CORS restreint aux origines connues
- Row Level Security (RLS) Supabase activé comme filet de sécurité supplémentaire

---

## Variables d'environnement requises (`.env.example`)

```env
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
DATABASE_URL=postgresql://postgres:[password]@db.xxxx.supabase.co:5432/postgres

# Redis (local via Docker)
REDIS_URL=redis://localhost:6379

# App
API_PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## Fichiers clés à créer en premier

- `docker-compose.yml` — Redis + MinIO
- `apps/api/prisma/schema.prisma` — modèle de données complet
- `apps/api/src/common/guards/tenant.guard.ts` — isolation multi-tenant
- `apps/api/src/auth/auth.module.ts` — vérification JWT Supabase
- `apps/web/src/middleware.ts` — protection des routes Next.js via `@supabase/ssr`
