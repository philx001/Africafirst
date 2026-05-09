# CRM Africa First — Cahier des charges fonctionnel (brouillon)

Document **métier** à compléter : il complète le plan technique  
[`crm-saas-plan-architecture-et-implementation.md`](./crm-saas-plan-architecture-et-implementation.md)  
et le code (`README.md`, `apps/api/prisma/schema.prisma`).

Pour chaque section ci-dessous, remplissez **À compléter** ; conservez ou mettez à jour **Déjà cadré** quand la réalité du produit ou du code change.

**Sources Mai 2026 (PDF → Markdown) :** détail métier dans [cahier-des-charges-perso-mai-2026.md](./cahier-des-charges-perso-mai-2026.md), priorités d’implémentation dans [cahier-des-charges-gem-cursor-mai-2026.md](./cahier-des-charges-gem-cursor-mai-2026.md). **Phases types (proposition)** : [reference-phases-types-programmes-crm.md](./reference-phases-types-programmes-crm.md).

**Périmètre CRM (précision)** : ce dépôt vise le **pilotage administratif** en trois volets : **processus commerciaux**, **gestion de projet**, **onboarding** clients/prospects ; contrats/devis, documents et données **commerciales/comptables**. **Deux piliers métiers** d’importance comparable : administration **autour de la formation** (LMS = app **distincte** pour l’opérationnel) ; **conseil, sensibilisation IA et implémentation IA en entreprise** (suivi contractuel et de delivery, pas l’exécution technique IA chez le client). **Lien CRM ↔ LMS** : phase ultérieure.

---

## 1. Contexte activité

### Déjà cadré (références)

- **Périmètre** : CRM **administratif** — **commercial**, **projets**, **onboarding** ; contrats/devis ; **programmes entreprise** (conseil, sensibilisation IA, suivi d’implémentation IA — pilotage et documents, **pas** runtime IA client). Plateforme de formation (**opérationnel** : vidéos, LMS, espaces produit formation) = **application séparée** ; **liaison** entre les deux = phase ultérieure (voir [cahier-des-charges-perso-mai-2026.md](./cahier-des-charges-perso-mai-2026.md) § périmètre).
- Produit présenté comme CRM SaaS multi-tenant avec pipeline commercial, projets, portail client, automatisations (`README`).
- Champ **devise** sur les opportunités (`Deal.currency`, défaut typique EUR dans le schéma).
- Champs **pays / ville** sur comptes et contacts (adresse géographique possible).
- Vision produit très générique dans le plan technique ; **Phase 1** usage interne, **Phase 2/3** montée en charge SaaS (voir plan d’architecture).

### À compléter

- **Secteur** d’activité précis (_ex. conseil, distribution, formation, …_).
- **Offre** : produits, services, projets livrés, durée typique des missions.
- **Canal** : B2B, B2C, ou mix.
- **Zones géographiques** cibles et **fuseaux**.
- **Devises** utilisées au quotidien, règles TVA / facturation si pertinent.
- **Langues** imposées côté clients et équipe interne.

---

## 2. Processus commercial

### Déjà cadré (références)

- Étapes de pipeline **génériques** dans le modèle : `lead`, `qualified`, `proposal`, `negotiation`, `won`, `lost`.
- Vue **Kanban** prévue pour les deals (plan + `README`).
- Liens deal → **projet**, dates de clôture prévue / réelle, probabilité, valeur.
- **Documents** rattachés aux deals (et comptes, contacts, projets).
- Automatisation d’exemple : deal gagné → création de projet (`README`).

### À compléter

- Étapes **réelles** chez vous (noms, ordre, besoin de nouvelles étapes).
- **Durées** ou SLA entre étapes.
- **Pièges / documents obligatoires** à chaque étape.
- **Critères exacts** de passage d’étape et de **perte** (qui valide, exceptions).
- Rôles **responsables** par étape.

---

## 3. Personas & rôles

### Déjà cadré (références)

- Rôles techniques actuels : **admin**, **member**, **client** (JWT / Prisma).
- **Portail client** isolé (filtrage par contact).
- Invitations avec rôle (`README`).

### À compléter

- Qui, dans votre organisation : **commercial**, **ops**, **direction**, **compta**, **partenaire**, etc.
- **Matrice droits / vues** : qui voit quels enregistrements, montants, pipelines.
- Besoin de **rôles supplémentaires** ou sous-profils métier au-delà de admin/member/client.

---

## 4. Parcours utilisateur détaillés

### Déjà cadré (références)

- Briques disponibles : contacts, comptes, deals, projets, tâches, **interactions**, **messagerie**, documents, automatisation, recherche (`README`, schéma).

### À compléter

À rédiger en **scénarios** avec prérequis, étapes, résultats attendus et **cas limites** :

- « **Onboarding** : de la signature au kickoff » —
- « **Programme conseil / sensibilisation IA / implémentation** : jalons et livrables » —
- « **Réclamation ou litige client** » —
- (_autres parcours critiques_) —

---

## 5. Objets métier & champs

### Déjà cadré (références)

- **Account**, **Contact**, **Deal**, **Project**, **Task** (avec sous-tâches), **Interaction** (email, appel, réunion, note), **Document**, **Notification**, **Message**, **AutomationRule**, **WorkflowLog**.
- `Organization.settings` (JSON) pour des extensions configurables futures.

### À compléter

Préciser le **besoin métier** (oui / non / plus tard) et les champs majeurs pour :

| Besoin           | Dans le périmètre ? | Notes / priorité |
|------------------|---------------------|------------------|
| Devis / propositions commerciales | | |
| Facturation      | | |
| Abonnements / recurrent | | |
| Stocks / catalogue | | |
| Contrats         | | |
| SLA engagements  | | |
| Tickets support  | | |
| (_autre_)        | | |

---

## 6. Rapports & indicateurs

### Déjà cadré (références)

- Recherche globale prévue / partielle selon l’avancement (`README`).
- Données structurées en base pour agrégations pipelines, tâches, projets (à exploiter dans des écrans à définir).

### À compléter

- **KPI obligatoires** (pipeline, conversion, délais moyens, charge par personne, etc.).
- **Tableaux de bord** par rôle.
- **Exports** souhaités (format, fréquence, filtres par équipe / segment / période).

---

## 7. Intégrations obligatoires

### Déjà cadré (références)

- **Webhooks sortants** et automatisation (exemples Make / n8n dans `README` et plan).
- Auth et stockage **Supabase**.

### À compléter

Liste **contractuelle** des intégrations : pour chacune — outil cible, **événements** déclencheurs, sens des données (CRM → outil, outil → CRM).

- Messagerie (Gmail / Outlook / autre) —
- Calendrier —
- Téléphonie / click-to-call —
- WhatsApp Business —
- Comptabilité —
- Autres flux réels (Make/n8n : quels scénarios de production ?) —

---

## 8. Contraintes non fonctionnelles

### Déjà cadré (références)

- Architecture **multi-tenant**, isolation par organisation, JWT Supabase (`README`, plan sécurité).
- Hébergement type : Supabase cloud + API / front déployés selon votre stack (voir `README`, Docker).

### À compléter

- **RGPD** : bases légales, conservation, anonymisation, droit d’accès / effacement, registre traitements si besoin.
- **Localisation des données** (UE, Afrique, exigences clients).
- **Disponibilité** ou charge cible si connue.
- **Performance** attendue (temps de réponse, volumétrie).
- **Accessibilité** (niveau visé).
- **Mode hors ligne** : requis ou non.

---

## 9. Périmètre & priorités

### Déjà cadré (références)

- Feuille de route **technique** par phases (semaines 1–10) dans le plan d’architecture.
- Plans tarifaires **suggérés** dans le schéma (`PlanType`) sans règle produit rédigée dans la doc repo.

### À compléter

- **MVP métier** : ce qui doit absolument exister pour la mise en production interne ou client pilote.
- **Phase 2 / 3** : fonctionnalités reportées mais validées stratégiquement.
- **Hors périmètre explicite** : ce que le CRM ne fera pas (pour éviter la dérive de scope).

---

## Historique des mises à jour (optionnel)

| Date       | Auteur | Changement |
|-----------|--------|------------|
| _YYYY-MM-DD_ | _…_ | Création du gabarit à partir du dépôt + plan Cursor. |
|           |        | |
