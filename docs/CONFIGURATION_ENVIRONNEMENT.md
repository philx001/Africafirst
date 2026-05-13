# Configuration environnement — principes réutilisables et suite du projet

Guide de référence sur la gestion des variables d’environnement et du setup local, applicable à tout projet équivalent (*full-stack*, BaaS, ORM SQL). Une section finale concerne la suite technique du dépôt **crm-africafirst**.

---

## 1. Secrets et versioning

| Principe | Détail |
|----------|--------|
| **Ne jamais versionner les secrets** | Fichiers type `.env`, `.env.local`, variantes `.env.*.local` : restent sur la machine locale, sur la plateforme de déploiement (secrets / variables CI) ou dans un coffre dédié. |
| **Modèle suivant dans Git** | Un fichier **`.env.example`** (ou équivalent) listant les **clés nécessaires** avec des valeurs **fictives** ou vides (`change-me`, URL générique `https://xxxxxxxx.supabase.co`, etc.). |
| **`.gitignore`** | Inclure explicitement `.env`, `.env.local` et variantes utilisées ; vérifier que les entrées ignorent bien **tout le dépôt** (patterns sans chemin restrictive si besoin). |
| **Avant chaque commit** | Parcourir `git status` : aucun fichier contenant des identifiants ne doit apparaître ; éviter `git add -f` sur un fichier sensible. |
| **Exposition accidentelle** | Toute capture, message ou historique Git contenant un secret doit conduire à **faire tourner** les clés et mots de passe concernés (API, JWT, DB), pas seulement à supprimer le fichier courant. |

---

## 2. Monorepos *frontend* + *API* (*Next.js*, *NestJS*, etc.)

Souvent plusieurs processus lisent les variables différemment :

| Emplacement habituel | Rôle |
|------------------------|------|
| **Racine du monorepo** | Fichier **`.env`** complet partagé logiquement par l’équipe (reste hors Git). Pratique quand plusieurs services utilisent les mêmes noms (`DATABASE_URL`, clés tiers). |
| **Dossier de l’API** | Fichier **`.env`** local si les outils (ex. CLI **Prisma**) ne chargent pas la racine : aligner avec le `.env` racine ou documenter une seule source de vérité. |
| **Dossier du front** (**Next.js**) | Variables exposées au navigateur **uniquement** si préfixées par **`NEXT_PUBLIC_`**. Pour le dev local, un fichier **`.env.local`** dans le dossier de l’app Next (avec le **point** devant le nom : `.env.local`, pas `env.local`). |

**Réduction du risque côté front :** dans `apps/web/.env.local`, ne mettre que le strict nécessaire en `NEXT_PUBLIC_*` ; pas besoin d’y dupliquer `DATABASE_URL`, clés serveur ou secrets JWT.

Consultez dans le code la configuration réelle (`ConfigModule` Nest, `envFilePath`, `next.config`, tableau **globalEnv** de Turborepo) pour savoir **quels fichiers** sont lus réellement.

---

## 3. Bases PostgreSQL (*Supabase* et équivalents) + Prisma

| Variable | Usage courant avec pooler distant |
|---------|--------------------------------------|
| **`DATABASE_URL`** | Connexion **via pool / transaction** (ex. port **6543**) pour le trafic applicatif jour à jour. |
| **`DATABASE_DIRECT_URL`** *(ou équivalent défini dans `schema.prisma`)* | Connexion pour **migrations**, introspection, opérations longues ou directes (**port souvent 5432** ou chaîne « session » selon la doc du fournisseur). |

À respecter :

- Le **nom** de la variable pour l’URL directe doit être **exactement** celui attendu par le schéma Prisma (**`directUrl`** → souvent **`DATABASE_DIRECT_URL`**), pas un synonyme générique (**`DIRECT_URL`**) incompatible.
- Récupérer les URIs depuis l’outil du fournisseur (**Connect → ORM → Prisma** sur Supabase) plutôt que de les taper à la main.
- Pas de **guillemets** autour des URI dans `.env` si votre chargeur enlève ou garde incorrectement les caractères parasites.
- **Mot de passe** : pas de placeholders du type **`[PASSWORD]`** dans l’URI finale ; caractères spéciaux (`@`, `:`, `%`, `#`, espaces…) → **pourcent-encoding** conforme RFC 3986, ou mot de passe plus simple lors de la phase de mise en route, ou string générée par le dashboard après saisie du MDP.
- Avertissement **IPv4 / IPv6** sur les connexions « direct » : si la connexion échoue en local sans IPv6, utiliser une variante « session pooler » recommandée par le fournisseur.

### 3.b Prisma — chemins du dépôt et commandes (`generate`, `migrate`)

| Élément | Emplacement dans *crm-africafirst* |
|--------|-------------------------------------|
| **Schéma Prisma** (modèles, `datasource`, `generator`) | `apps/api/prisma/schema.prisma` |
| **Migrations SQL** (historique à versionner) | `apps/api/prisma/migrations/` |
| **Client généré** (ne pas éditer à la main ; régénéré par la CLI) | `node_modules/@prisma/client` et fichiers sous `node_modules/.prisma/client` (souvent à la **racine** du monorepo avec npm workspaces) |

**Variables d’environnement** : Prisma lit en général un `.env` à la racine du monorepo et/ou dans `apps/api` selon votre configuration ; l’URI base est **`DATABASE_URL`** (et **`DATABASE_DIRECT_URL`** pour `directUrl` dans le schéma, ex. migrations).

**Générer le client** (après modification du schéma ou pull Git) :

```bash
# Depuis le dossier API (recommandé si votre .env est bien chargé ici)
cd apps/api
npm run db:generate
# équivalent :
npx prisma generate
```

Si vous êtes à la **racine** du monorepo (utile quand le même `node_modules` sert tout le workspace) :

```bash
npx prisma generate --schema apps/api/prisma/schema.prisma
```

**Appliquer les migrations** (base accessible, `DATABASE_URL` / direct selon besoin) :

```bash
cd apps/api
npm run db:migrate
# équivalent production / déploiement :
npx prisma migrate deploy
```

**Création / évolution du schéma en local** (génère une migration nommée) :

```bash
cd apps/api
npm run db:migrate:dev
# équivalent :
npx prisma migrate dev
```

**Studio** (exploration des tables) : `cd apps/api && npm run db:studio` ou `npx prisma studio` depuis `apps/api`.

#### Verrou Windows (`EPERM`, `query_engine-windows.dll.node`)

Le moteur Prisma est un fichier `.dll` / `.node` parfois **verrouillé** tant qu’un processus Node s’en sert (serveur Next, API Nest, Turbo, ancien `prisma studio`, etc.). Avant `prisma generate` :

1. **Dans le terminal où tourne le dev** : `Ctrl+C` pour arrêter `npm run dev` / `turbo dev`.
2. **Sinon**, sous **PowerShell**, arrêter uniquement ce qui **écoute** sur les ports habituels du projet (**3000** = web, **3001** = API) :

```powershell
$ports = 3000, 3001
foreach ($port in $ports) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object {
      Write-Host "Arrêt PID $($_.OwningProcess) (port $port)"
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}
```

*(Éviter `Stop-Process` sur tous les `node` en une fois : cela peut affecter d’autres outils, dont l’IDE.)*

Puis relancer `npm run db:generate` ou `npx prisma generate` comme ci-dessus.

---

## 4. Identité Supabase-type : URL, clés, JWT

| Variable | Usage typique |
|----------|----------------|
| **`SUPABASE_URL`** / **`NEXT_PUBLIC_SUPABASE_URL`** | Origine du projet **sans** suffixe **`/rest/v1/`**. Même valeur côté public et contrôlé avec prudence. |
| **`SUPABASE_ANON_KEY`** / **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** | Clé exposable navigateur (« publishable / anon ») ; **la même valeur** sur les deux variables si votre stack le prévoit. |
| **`SUPABASE_SERVICE_ROLE_KEY`** | Uniquement **serveur**, jamais dans le bundle client. |
| **`SUPABASE_JWT_SECRET`** | Secret **Legacy JWT / HS256** fourni sous **JWT Keys → Legacy JWT Secret** pour vérifier les jetons utilisateurs côté API — **pas** interchangeable avec la *service role key*. Une plateforme basculée uniquement vers des signatures asymétriques peut exiger ensuite une mise à jour du code (*JWKS*). |

Une ligne dans **`.env`** ne doit avoir qu’**un seul** signe **`=`** servant de séparateur : pas de valeur du type `VAR=OTHER_VAR=value`.

---

## 5. Autres bonnes habitudes localement

| Sujet | Recommandation |
|-------|----------------|
| **Cache / queues** | URL du service (**Redis**, etc.) locale via Docker (`localhost` et port connus). |
| **URLs internes API** | `API_URL`, `NEXT_PUBLIC_API_URL` cohérents avec le port réel (**3001**) en développement. |
| **Stockage objet** | Noms des buckets (**documents**, **avatars**, …) comme variables séparées du code métier lorsque configurables. |
| **Secrets facultatifs** | Si une variable existe dans **`.env.example`** mais n’est encore lue **nulle part** dans le code, elle reste facultative jusqu’à branchement explicite. |
| **Production** | Même jeu de **noms** de variables ; valeurs différentes par environnement ; ne jamais committer tel quel les fichiers locaux `.env` / `.env.local`. |

---

## 5.b Incident TLS local (Supabase) — temporaire vs définitif

Contexte observé sur ce poste : certains appels Node vers Supabase échouent avec `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (*fetch failed*), ce qui casse inscription/connexion même si les variables sont correctes.

- **Contournement temporaire (dev uniquement, non sécurisé)**  
  Lancer le monorepo avec :
  `npm run dev:insecure-tls`  
  (définit `CRM_DEV_INSECURE_TLS=1` et `NODE_TLS_REJECT_UNAUTHORIZED=0` pour Turbo ; le code **refuse** ces réglages si `NODE_ENV=production`).
- **Solution définitive (production et postes « propres »)**  
  Installer le certificat racine de l’environnement réseau (proxy/antivirus/entreprise), puis configurer Node avec :
  `NODE_EXTRA_CA_CERTS=/chemin/vers/ca-root.pem`  
  et revenir au script standard `npm run dev` sans désactiver la vérification TLS.

**Production / CI (obligatoire)**

- Ne **pas** définir `CRM_DEV_INSECURE_TLS`.
- Ne **pas** définir `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- Les images Docker du dépôt fixent déjà `NODE_ENV=production` ; l’API **refuse de démarrer** si ces variables dangereuses sont présentes.
- La route Next `/api/auth/sign-in` répond **503** si une telle config est détectée en production.

> **Important :** ne pas utiliser le mode `insecure-tls` en production, CI ou sur un poste exposé.

---

## 6. Suite du projet *CRM Africa First* — recommandations

Checklist après configuration des fichiers d’environnement :

1. **Docker :** démarrer Redis (`docker compose up -d redis` à la racine).
2. **Dépendances :** `npm install` à la racine du monorepo.
3. **Supabase Storage :** créer les buckets configurés (**documents**, **avatars**) si absent.
4. **Prisma :** schéma dans `apps/api/prisma/schema.prisma` ; commandes détaillées (dont `generate` et `migrate`) → **§ 3.b**. En résumé : depuis `apps/api`, `npm run db:generate` puis `npm run db:migrate` (ou `db:migrate:dev` pour créer une migration en local). En cas d’erreur **EPERM** sous Windows lors du `generate`, arrêter les serveurs de dev (voir § 3.b).
5. **Développement :** `npm run dev` à la racine ; vérifier API (**Swagger** sous `/api/docs` si disponible), application web sur le port prévu (**3000**).
6. **Poursuite du projet :** le **`.gitignore`** actuel exclut le dossier `apps/api/prisma/migrations/` — **harmoniser** avec la stratégie d’équipe (en général on **versionne** les migrations Prisma dans Git pour reproduire la base ; sinon documenter une autre procédure).
7. **CI/CD :** lorsque déployé, injecter **`DATABASE_*`**, clés Supabase et secrets hors dépôt via les mécanismes plateforme.
8. **Durcissement :** personnaliser **`JWT_COOKIE_SECRET`** et **`WEBHOOK_SECRET`** dès usage réel ou exposition réseau.

---

*Document généré pour servir de référence de configuration ; adapter les chemins (`apps/api`, `apps/web`) aux conventions du dépôt si elles évoluent.*
