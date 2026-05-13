# Guide des processus métier et des implémentations (référence vivante)

**Objectif.** Ce fichier centralise **où** se passent les choses dans l’application, **quel flux métier** est couvert par le code à ce jour, et **pourquoi** certains choix techniques ont été faits (sessions de développement / phases). À mettre à jour au fil des itérations jusqu’à la fin du projet.

**Public.** Product owners, développeurs, et toute personne qui veut se repérer sans relire l’historique des conversations.

**Documents produit complémentaires.** [cahier-des-charges-perso-mai-2026.md](./cahier-des-charges-perso-mai-2026.md), [cahier-des-charges-gem-cursor-mai-2026.md](./cahier-des-charges-gem-cursor-mai-2026.md), [reference-phases-types-programmes-crm.md](./reference-phases-types-programmes-crm.md), [crm-saas-plan-architecture-et-implementation.md](./crm-saas-plan-architecture-et-implementation.md).

---

## 1. Carte de navigation : où est quoi ?

| Besoin | Où dans l’app (web) | Remarque |
|--------|---------------------|----------|
| Vue pipeline (kanban des deals) | **Pipeline** → URL `/deals` | Création rapide d’un deal en haut de page ; **pas** de liste de devis ici. |
| **Devis, contrats, onboarding liés à un deal** | Fiche deal → URL **`/deals/[id]`** | Depuis le pipeline : icône « lien externe » en haut à droite de chaque carte deal (infobulle explicite). |
| Contacts / entreprises | Menus dédiés | Les devis peuvent réutiliser le contact du deal ; **modèles de devis** : page **Contrats** (bas de page). |
| Portail client (signature contrat, etc.) | Parcours client (routes `/client/...`) | Le tunnel interne prépare les contrats ; le signataire va sur le portail pour signer. |
| Automatisations | Menu **Automatisations** | Règles par organisation ; certaines actions passent par une file Redis (Bull). |
| Paramètres tenant | **Paramètres** | Organisation, équipe, JSON avancé (webhooks tunnel contrat, `disableAutoOnboardingProject`, etc.). |

Les **devis** ne sont pas un module avec une entrée de menu séparée : ils sont **rattachés à un deal** et gérés sur la **fiche du deal**. C’est un choix d’architecture « tout le cycle commercial passe par le deal », cohérent avec le schéma Prisma (`Quote.dealId`).

---

## 2. Pipeline commercial (deals)

### Comportement

- Le menu **Pipeline** pointe vers `/deals` : titre **Pipeline Commercial**, formulaire « Nouveau deal », puis kanban par étapes (`lead`, `qualifié`, etc.).
- Chaque carte est déplaçable entre colonnes ; le détail du deal ouvre **`/deals/[id]`** via le lien en coin de carte.

### Problème corrigé (affichage kanban vide alors que les deals existent)

- **Cause.** Le frontend faisait `api.get('/deals/kanban').then(r => r.data)`, alors que l’API renvoie **directement** l’objet `{ lead: [...], qualified: [...], ... }` et que le client Axios renvoie déjà le corps JSON. `r.data` était donc `undefined`.
- **Correctif.** Utiliser la réponse telle quelle : `r as Record<string, Deal[]>` (fichier `apps/web/src/components/kanban/deals-kanban.tsx`).

### Création de deal et erreurs

- Une erreur générique pouvait survenir après création si les **automatisations** avec action **webhook** tentaient d’enfiler un job Bull **sans Redis disponible**.
- **Correctif.** L’enqueue vers Bull est entouré d’un try/catch côté API pour ne pas faire échouer la requête métier (logs d’avertissement). Redis reste nécessaire pour exécuter réellement les webhooks async.

---

## 3. Tunnel métier « Devis → Contrat → Onboarding »

### Où ça vit dans le code UI

- Composant principal : **`DealContractTunnel`** (`apps/web/src/components/crm/deals/deal-contract-tunnel.tsx`), rendu depuis **`DealDetailClient`** sur **`/deals/[id]`** (`apps/web/src/components/crm/deals/deal-detail-client.tsx`).
- La fiche deal affiche aussi : **type d’offre**, **documents** du deal, un **encadré récap** du tunnel (étapes 1→2→3), et une **alerte** si aucun contact n’est lié au deal (indispensable pour « envoyer le devis » et « envoyer pour signature »).

### Flux métier (ordre logique)

1. **Devis**  
   - Création manuelle (**type de prestation** : même référentiel que les contrats, enum `ContractActivityType`) ou **génération depuis un modèle interne** (`POST /quotes/from-template`) : texte interpolé avec organisation, contact, entreprise, deal (placeholders comme les contrats) + `{{deal.offerTypeLabel}}`, `{{prestation.type}}`, etc. Les **modèles** se gèrent sur la page **Contrats** (panneau « Modèles de devis ») et depuis la fiche deal (filtre par type / sélection de modèle).  
   - Le rendu du modèle est stocké dans le champ **`body`** du devis ; `templateId` et **`prestationType`** sont conservés pour le filtre métier et la chaîne jusqu’au contrat (`activityType` du contrat hérite du `prestationType` du devis lors de `from-quote`).  
   - Si le deal a un contact/entreprise, l’API **recopie** contact et compte vers le devis à la création (`QuotesService.create`).  
   - États : brouillon → envoyé → accepté / refusé / expiré (actions présentes côté interne ; l’acceptation **côté portail client** pour le devis peut faire l’objet d’une évolution ultérieure).

2. **Contrat**  
   - Bouton **« Générer le contrat »** sur un devis **accepté** : `POST /contracts/from-quote/:quoteId`.  
   - Si le devis n’avait pas encore de contact mais que le deal en a un **depuis**, le service **relecture le deal** pour compléter signataire / compte avant création du contrat.

3. **Signature**  
   - Depuis la liste des contrats du deal : **« Envoyer pour signature »** → portail client.  
   - L’API exige un `contactId` sur le contrat pour l’envoi.

4. **Onboarding (automatique après signature)**  
   - Méthode **`ensureTunnelOnboardingProject`** dans `ContractsService` (`apps/api/src/contracts/contracts.service.ts`), appelée après finalisation de la signature.  
   - Effets : deal passé en **gagné** si ce n’était pas déjà le cas ; création **idempotente** d’un projet nommé du type « Onboarding — … » avec tag **`tunnel_onboarding`**, **phases par défaut** (kickoff, contrat, onboarding, livraison, clôture), phase **« Contrat & signature »** déjà marquée **terminée** ; métadonnées du contrat mises à jour avec l’identifiant du projet.  
   - Désactivation possible : `Organization.settings.disableAutoOnboardingProject === true` (voir page Paramètres, JSON organisation).

### Type d’offre

- Champ **`offerType`** sur le deal (et propagé au projet créé automatiquement), sélecteur sur la fiche deal. Biblio commune : package `@crm/shared` (`OFFER_TYPES`).

### API utiles (mémo rapide)

- Devis : `GET/POST /api/v1/quotes`, `POST /api/v1/quotes/from-template`, `GET/POST/PUT/DELETE /api/v1/quotes/templates`, `POST .../quotes/:id/send|accept|reject`  
- Contrats : `POST /api/v1/contracts/from-quote/:quoteId`, `POST .../contracts/:id/send-for-signature`  
- Kanban deals : `GET /api/v1/deals/kanban`

---

## 4. Sécurité cross-origin et environnement dev (frontend ↔ API)

### Symptôme

- Navigateur sur `http://localhost:3000`, API sur `http://localhost:3001` : erreurs **CORS** en masse dans la console ; aucune donnée ne charge ; création impossible.

### Correctifs dans `apps/api/src/main.ts`

- **Ordre middleware** : CORS configuré **avant** Helmet pour que les prévols OPTIONS reçoivent les bons en-têtes.  
- **Helmet** : `crossOriginResourcePolicy: { policy: 'cross-origin' }` pour ne pas casser une SPA sur un autre port ; désactivation du **CSP** Helmet hors production pour une API JSON.  
- **Origines** locales : liste élargie + en non-production autorisation des origines « localhost / 127.0.0.1 / [::1] » sur n’importe quel port pour le dev.  
- **En-têtes** prévol : liste `allowedHeaders` étendue (Authorization, Accept, entêtes usuelles Supabase, etc.).  
- Pour une origine refusée en production : `callback(null, false)` sans lever une `Error` dans le handler CORS (comportement plus propre pour le navigateur).

### Guards JWT et OPTIONS

- **`JwtAuthGuard`** : bypass explicite des requêtes **`OPTIONS`** pour éviter tout refus JWT sur prévol.

Après modification de ces points, il faut **redémarrer l’API** ; le front `next dev` sur le port 3000 reste configuré avec `NEXT_PUBLIC_API_URL` pointant vers `http://localhost:3001` (ou l’URL réelle de l’API).

---

## 5. Paramètres (page tenant)

### Symptôme

- Deux blocs gris « vides » sans message : en réalité **requête `GET /organizations/me` en erreur** ; l’ancien code traitait `!data` comme chargement perpétuel.

### Correctif

- Gestion de **`isError`** avec message, conseils (API, `NEXT_PUBLIC_API_URL`, session), bouton **Réessayer** ; chargement basé sur **`isPending`** (`apps/web/src/components/crm/settings/org-settings.tsx`).

---

## 6. Multi-tenant et données « vides »

- Toutes les entités portent un **`organizationId`** ; l’utilisateur courant est résolu via le JWT Supabase (`app_metadata.organization_id`) et la table `users` liée.  
- Si le compte ou l’organisation change, ou si la base / le `DATABASE_URL` change, les listes peuvent paraître **vides** sans qu’il y ait eu « suppression » dans l’autre environnement : ce sont souvent **deux silos** distincts.

---

## 7. Suivi des phases (plan dépôt)

Le fichier [crm-saas-plan-architecture-et-implementation.md](./crm-saas-plan-architecture-et-implementation.md) contient les todos ; la tâche **tunnel contractuel + onboarding** y est passée en **completed** lorsque le code et la doc produit étaient alignés. D’autres sujets (RLS finalisée, notifications temps réel, etc.) peuvent rester **en cours** ou **à faire**.

---

## 8. Comment tenir ce guide à jour

À chaque livraison significative :

1. Ajouter une sous-section datée ou un encart **« Changelog guide »** en fin de fichier (date, résumé, fichiers touchés).  
2. Mettre à jour la **section 1** si de nouveaux menus ou routes apparaissent.  
3. Ne pas dupliquer les détails d’API exhaustifs : renvoyer vers **Swagger** `/api/docs` quand c’est suffisant.

---

*Dernière mise à jour du contenu : intégration des correctifs pipeline, CORS, tunnel devis–contrat–onboarding, paramètres et garde-fous automatisations / Redis.*
