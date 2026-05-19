# Guide de déploiement — CRM Africa First

> Ce document décrit la procédure complète pour déployer l'application en production.  
> Pour la configuration des variables d'environnement, voir [`CONFIGURATION_ENVIRONNEMENT.md`](./CONFIGURATION_ENVIRONNEMENT.md).

---

## Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Node.js | 20.x |
| npm | 10.x |
| Docker + Compose V2 | Docker 24+ |
| Accès Supabase | Projet créé, clés disponibles |
| Redis | 7.x (inclus dans `docker-compose.prod.yml`) |

---

## 1. Secrets GitHub (CI/CD)

Ajouter dans **GitHub → Settings → Secrets and variables → Actions** :

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | URL de connexion Prisma (pooler transaction, port 6543) |
| `DATABASE_DIRECT_URL` | URL directe Prisma (migrations, port 5432) |
| `NEXT_PUBLIC_API_URL` | URL publique de l'API en production (ex: `https://api.mondomaine.com`) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme Supabase |
| `REDIS_PASSWORD` | Mot de passe Redis production (chaîne aléatoire 32+ caractères) |

> **Jamais** de vraie valeur dans `.env.example` ou dans le code.

---

## 2. Préparation Supabase

### 2.1 Buckets Storage

Créer dans **Supabase Dashboard → Storage** :

| Bucket | Visibilité | Politiques RLS |
|--------|-----------|----------------|
| `documents` | Privé | Appliquer `docs/supabase-storage-documents-rls.sql` |
| `exports` | Privé | Appliquer `docs/supabase-storage-documents-rls.sql` |
| `avatars` | Public (lecture) | Aucune policy restrictive nécessaire |

Appliquer les politiques RLS Storage via **SQL Editor Supabase** :
```sql
-- Copier/coller le contenu de docs/supabase-storage-documents-rls.sql
```

### 2.2 JWT — app_metadata

Pour chaque utilisateur créé, le JWT doit contenir dans `app_metadata` :
```json
{
  "organization_id": "cuid...",
  "user_role": "admin|member|client",
  "contact_id": "cuid..." // uniquement pour les clients
}
```

Ces champs sont écrits par l'API lors de l'inscription/invitation.

---

## 3. Déploiement via CI (recommandé)

### 3.1 Flux de release

```
git tag v1.0.0
git push origin v1.0.0
```

Le workflow `.github/workflows/release.yml` s'exécute automatiquement :
1. **Quality** — typecheck, lint, tests
2. **Migrate** — `prisma migrate deploy` sur la base de production
3. **Docker** — build & push images vers GitHub Container Registry
4. **Release** — création de la GitHub Release avec changelog automatique

### 3.2 Activer le déploiement automatique

Dans `.github/workflows/release.yml`, décommenter le bloc correspondant à votre hébergeur :
- **Railway** : décommenter `deploy-railway`
- **Render** : décommenter `deploy-render` (ajouter les secrets `RENDER_DEPLOY_HOOK_*`)
- **VPS** : décommenter `deploy-vps` (ajouter `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`)

---

## 4. Déploiement manuel (VPS / serveur dédié)

### 4.1 Première installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/<org>/crm-africafirst.git
cd crm-africafirst

# 2. Créer le fichier d'environnement de production
cp .env.example .env
# Éditer .env avec les vraies valeurs de production

# 3. Appliquer les migrations
npm ci
npm run db:generate
npm run db:migrate   # prisma migrate deploy

# 4. Appliquer les politiques RLS Storage dans Supabase SQL Editor
# (copier docs/supabase-storage-documents-rls.sql)

# 5. Démarrer les services
docker compose -f docker-compose.prod.yml up -d --build
```

### 4.2 Mises à jour

```bash
# Récupérer les nouveaux commits / tag
git pull origin main   # ou git checkout vX.Y.Z

# Appliquer les nouvelles migrations AVANT de redémarrer l'API
npm run db:migrate

# Rebuilder et redémarrer
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

# Nettoyage des images orphelines
docker system prune -f
```

### 4.3 Migrations via Docker (sans Node local)

```bash
# Exécuter uniquement le service de migration (profil `migrate`)
docker compose -f docker-compose.prod.yml --profile migrate run --rm api-migrate
```

---

## 5. Variables d'environnement obligatoires en production

| Variable | Valeur type | Commentaire |
|----------|-------------|-------------|
| `NODE_ENV` | `production` | **Ne pas omettre** |
| `DATABASE_URL` | `postgresql://...` | Pooler transaction (port 6543) |
| `DATABASE_DIRECT_URL` | `postgresql://...` | Direct (port 5432), pour migrations |
| `SUPABASE_URL` | `https://xxx.supabase.co` | |
| `SUPABASE_ANON_KEY` | `eyJ...` | |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | **Serveur uniquement** |
| `SUPABASE_JWT_SECRET` | string | Legacy JWT Secret (projet Supabase → JWT Keys) |
| `REDIS_URL` | `redis://:PWD@redis:6379` | Avec mot de passe en prod |
| `REDIS_PASSWORD` | string aléatoire | 32+ caractères |
| `JWT_COOKIE_SECRET` | string aléatoire | 32+ caractères |
| `WEBHOOK_SECRET` | string aléatoire | Pour la vérification HMAC des webhooks entrants |
| `NEXT_PUBLIC_API_URL` | `https://api.mondomaine.com` | |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | |

> **Ne jamais définir** `CRM_DEV_INSECURE_TLS=1` ou `NODE_TLS_REJECT_UNAUTHORIZED=0` en production.  
> L'API refuse de démarrer si ces variables sont présentes avec `NODE_ENV=production`.

---

## 6. Checklist avant mise en production

- [ ] Variables d'environnement configurées et testées
- [ ] Migrations appliquées (`prisma migrate status` = tout OK)
- [ ] Buckets Supabase Storage créés (`documents`, `exports`, `avatars`)
- [ ] Politiques RLS Storage appliquées
- [ ] `REDIS_PASSWORD` défini et non vide
- [ ] `JWT_COOKIE_SECRET` et `WEBHOOK_SECRET` changés (non `change-me-*`)
- [ ] `NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MS` aligné sur JWT expiry Supabase
- [ ] Healthcheck API répond : `GET https://api.mondomaine.com/health`
- [ ] Test de connexion portail client (rôle `client`)
- [ ] Test de connexion interne (rôle `admin`)

---

## 7. Healthcheck & monitoring

L'API expose `GET /health` (endpoint standard NestJS Terminus).  
Le `docker-compose.prod.yml` vérifie ce endpoint toutes les 30 secondes.

Pour vérifier manuellement :
```bash
curl -f https://api.mondomaine.com/health
# Réponse attendue : {"status":"ok"}
```

---

## 8. Rollback

```bash
# Revenir à un tag précédent
git checkout v1.0.1
npm run db:migrate                     # appliquer d'éventuelles migrations down (si existantes)
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
```

> Prisma ne génère pas de migrations `down` automatiquement.  
> Pour une rollback DB, restaurer depuis le backup Supabase si nécessaire.

---

## 9. Logs

```bash
# Logs API
docker compose -f docker-compose.prod.yml logs -f api

# Logs Web
docker compose -f docker-compose.prod.yml logs -f web

# Logs Redis
docker compose -f docker-compose.prod.yml logs -f redis
```

---

*Document à mettre à jour à chaque changement d'infrastructure ou de procédure de déploiement.*
