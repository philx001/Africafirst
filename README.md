# CRM Africa First — Documentation d'installation

CRM SaaS multi-tenant : **processus commerciaux**, **gestion de projet**, **onboarding** clients/prospects, contrats et automatisations ; **pilotage** des programmes **conseil / sensibilisation IA / implémentation IA** en entreprise (administratif).

L’exploitation de la **plateforme de formation en ligne** (vidéos, LMS, espaces produit formation) est portée par **une application distincte** ; ce dépôt couvre le volet **administratif** (pipeline, contrats, **onboarding**, pilotage projet, programmes **IA entreprise** côté gestion). Une **interconnexion** CRM ↔ LMS est prévue plus tard ([docs/cahier-des-charges-perso-mai-2026.md](docs/cahier-des-charges-perso-mai-2026.md) § périmètre).

## Documentation

| Document | Rôle |
|----------|------|
| [docs/crm-saas-plan-architecture-et-implementation.md](docs/crm-saas-plan-architecture-et-implementation.md) | Plan d’architecture & **implémentation ajustée (mai 2026)** |
| [docs/CAHIER_DES_CHARGES_FONCTIONNEL.md](docs/CAHIER_DES_CHARGES_FONCTIONNEL.md) | Cahier des charges fonctionnel — à compléter (métier, périmètre) |
| [docs/cahier-des-charges-perso-mai-2026.md](docs/cahier-des-charges-perso-mai-2026.md) | Cahier des charges détaillé (Mai 2026) — référence métier |
| [docs/cahier-des-charges-gem-cursor-mai-2026.md](docs/cahier-des-charges-gem-cursor-mai-2026.md) | Version synthétique + priorités d’exécution (Mai 2026) |
| [docs/reference-phases-types-programmes-crm.md](docs/reference-phases-types-programmes-crm.md) | Bibliothèque proposée : phases **onboarding**, **programmes IA**, **formation admin**, **dev** — noyau MVP |

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | NestJS, TypeScript |
| Base de données | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| ORM | Prisma |
| Queue | BullMQ + Redis |
| Stockage | Supabase Storage |
| Monorepo | Turborepo |

---

## Prérequis

- Node.js >= 20
- npm >= 10
- Docker & Docker Compose
- Un projet Supabase créé (https://supabase.com)

---

## Installation

### 1. Cloner et configurer les variables d'environnement

```bash
git clone <repo-url>
cd crm-africafirst
cp .env.example .env
```

Remplir `.env` avec les valeurs de votre projet Supabase :
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
- `DATABASE_URL` (Supabase → Settings → Database → Connection string → URI)

### 2. Démarrer les services locaux (Redis)

```bash
docker-compose up -d redis
```

### 3. Installer les dépendances

```bash
npm install
```

### 4. Configurer Supabase Storage

Dans votre tableau de bord Supabase, créer deux buckets :
- `documents` (privé)
- `avatars` (public)

### 5. Générer le client Prisma et appliquer les migrations

```bash
cd apps/api
npm run db:generate
npm run db:migrate:dev --name init
```

### 6. Lancer en développement

```bash
# Depuis la racine du monorepo
npm run dev
```

- API NestJS : http://localhost:3001
- Documentation Swagger : http://localhost:3001/api/docs
- Frontend Next.js : http://localhost:3000

---

## Créer le premier compte administrateur

1. Ouvrir http://localhost:3000/register
2. Remplir le formulaire (nom, email, mot de passe, nom de l'organisation)
3. Se connecter sur http://localhost:3000/login

---

## Inviter des utilisateurs

Via Swagger (`POST /api/v1/auth/invite`) ou l'interface Settings :
- `role: "member"` → accès interne
- `role: "client"` → accès portail client uniquement

---

## Structure du projet

```
crm-africafirst/
├── apps/
│   ├── api/                    # Backend NestJS
│   │   ├── src/
│   │   │   ├── auth/           # Authentification JWT Supabase
│   │   │   ├── contacts/       # Module contacts
│   │   │   ├── accounts/       # Module entreprises
│   │   │   ├── deals/          # Pipeline commercial
│   │   │   ├── projects/       # Gestion de projets
│   │   │   ├── tasks/          # Tâches et sous-tâches
│   │   │   ├── interactions/   # Historique interactions
│   │   │   ├── documents/      # Supabase Storage
│   │   │   ├── notifications/  # Notifications in-app
│   │   │   ├── automations/    # Moteur d'automatisation BullMQ
│   │   │   ├── client-portal/  # API portail client
│   │   │   ├── search/         # Recherche globale
│   │   │   └── webhooks/       # Dispatcher webhooks sortants
│   │   └── prisma/
│   │       └── schema.prisma   # Modèle de données complet
│   └── web/                    # Frontend Next.js
│       └── src/
│           ├── app/
│           │   ├── (auth)/     # Login / Register
│           │   ├── (internal)/ # CRM interne (admin/member)
│           │   └── (client)/   # Portail client
│           ├── components/
│           │   ├── layout/     # Sidebar, Topbar
│           │   ├── crm/        # Composants métier
│           │   └── kanban/     # Kanban drag & drop
│           └── lib/            # API client, Supabase, utils
└── packages/
    └── shared/                 # Types et constantes partagés
```

---

## Sécurité multi-tenant

- Chaque requête API vérifie le JWT Supabase via `SUPABASE_JWT_SECRET`
- L'`organization_id` est extrait du JWT et injecté dans **toutes** les requêtes Prisma
- Aucune route ne peut accéder aux données d'une autre organisation
- Le portail client filtre en plus par `contact_id`

---

## Automatisations — Exemples

### Deal gagné → Créer un projet automatiquement

```json
{
  "name": "Deal gagné → Projet",
  "trigger": "deal.won",
  "conditions": [],
  "actions": [
    {
      "type": "create_project",
      "name": "Nouveau projet client"
    }
  ]
}
```

### Tâche créée → Webhook Make/n8n

```json
{
  "name": "Notifier n8n",
  "trigger": "task.created",
  "conditions": [],
  "actions": [
    {
      "type": "send_webhook",
      "url": "https://hook.eu1.make.com/xxx",
      "secret": "mon-secret"
    }
  ]
}
```

---

## Déploiement production

```bash
# Build de toutes les apps
npm run build

# Ou via Docker Compose complet
docker-compose up -d
```

Variables d'environnement à définir côté serveur : toutes celles de `.env.example` avec les valeurs de production.

---

## API Reference

Documentation Swagger disponible sur `/api/docs` en mode développement.

Endpoints principaux :
- `POST /api/v1/auth/register` — Créer un compte
- `POST /api/v1/auth/login` — Connexion
- `GET /api/v1/contacts` — Lister les contacts
- `GET /api/v1/deals/kanban` — Vue kanban du pipeline
- `GET /api/v1/projects` — Lister les projets
- `GET /api/v1/client/dashboard` — Dashboard portail client
- `GET /api/v1/search?q=...` — Recherche globale
- `POST /api/v1/automations` — Créer une règle d'automatisation
