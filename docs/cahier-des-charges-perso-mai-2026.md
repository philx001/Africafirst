# Cahier des charges — CRM Africa First (version personnelle, Mai 2026)

Source : export du PDF `Cahier des Charges_Perso.pdf`. Document métier détaillé ; référence fonctionnelle principale.

---

## Périmètre : CRM administratif vs plateforme de formation (LMS)

**Précision majeure** — ce cahier cible surtout la **couche administrative** du CRM, pas l’exploitation pédagogique d’une plateforme de formation.

| Volet | Application | Rôle |
|--------|-------------|------|
| **Formation en ligne (opérationnel)** | **Autre application** (LMS) | Vidéos, contenus, espaces **Entreprises** et **Formateurs** au sens *produit formation*, utilisateurs et parcours côté formation. |
| **Commercial, juridique, pilotage, onboarding** | **Ce CRM** | Processus **commerciaux**, **gestion de projet**, **onboarding** clients/prospects ; comptes/contacts, deals, devis / contrats / documents, phases de **livraison** et pilotage ; informations **commerciales ou comptables** ; administration des **contrats signés** avec les entreprises pour le **conseil**, la **sensibilisation** (notamment à l’**intelligence artificielle**), la **planification** et le suivi de l’**implémentation de l’IA** au sein des entreprises — avec les processus et fonctionnalités qui s’y rattachent (jalons, livrables, ateliers, revues, conformité documentaire, etc.). |

- Le CRM **ne gère pas** l’opérationnel de la formation en ligne (diffusion des cours, expérience apprenant dans le LMS, etc.) **ni l’exécution technique des systèmes d’IA** chez le client (runtime, MLOps, etc.) : il **administre** le cadre contractuel, la planification, le suivi de projet et les preuves / documents associés à ces programmes.
- **Second temps** : prévoir un **lien entre les deux applications** (événements, identifiants externes, synchronisations ciblées, API ou webhooks — à cadrer) sans confondre les périmètres.

---

## Fonctions cœur administrées par le CRM

Le CRM est conçu pour **piloter et administrer** trois familles de processus, au même titre :

1. **Processus commerciaux** — prospection, qualification, deals, propositions, négociation, clôture.
2. **Gestion de projet** — après signature ou en phase de delivery : jalons, tâches, livrables, interactions, reporting direction.
3. **Onboarding clients / prospects** — parcours structuré : collecte d’informations, validation des prérequis, documents à fournir ou signer, handover vers la phase de **projet** ou de **programme** ; suivi jusqu’à une **entrée en production** administrativement définie.

**Deux volets métiers d’égale importance** pour la cible « Africa First » (tous deux **hors exploitation opérationnelle du LMS**) :

- **A — Administration liée à la plateforme de formation (LMS externe)** : cadre commercial et contractuel, relation formateurs/entreprises côté **paperwork et pilotage** ; le LMS reste l’outil **produit** de la formation.
- **B — Programmes entreprise : conseil, sensibilisation et implémentation de l’IA** : gestion des **contrats signés** avec les entreprises pour le **conseil**, la **sensibilisation** à l’IA, la **planification** et l’**administration** du **déploiement / implémentation de l’IA** (gouvernance, ateliers, feuilles de route, exigences, livrables, validations — **à détailler en scénarios**). Le CRM est le **hub** de ces processus ; les outils d’IA ou d’infrastructure client restent **externes** au périmètre sauf intégrations prévues.

---

## 1. Contexte activité

**Secteur :** Services et projets. Canal mixte **B2B et B2C**. Le projet central concerne en priorité la gestion **dans ce CRM** de plusieurs activités, dont **deux piliers métiers comparables** :

- Le **volet formation (administratif)** : suivi **commercial et contractuel** de la mise en relation formateurs / entreprises (l’**exploitation** de la plateforme — vidéos, espaces et utilisateurs **côté LMS** — est portée par **l’application de formation distincte**).
- Le **volet conseil & IA en entreprise** : après signature des **contrats avec les entreprises**, administration des programmes de **conseil**, **sensibilisation à l’IA**, **planification** et suivi de **l’implémentation de l’IA** (processus, jalons, livrables et fonctionnalités associées — à cadrer finement).
- Le **développement sur mesure** d’applications, de sites web et **l’implémentation d’automatisation** au sein des entreprises (prestations connexes, livrables projet).

D’autres services doivent pouvoir être gérés ou ajoutés dans le CRM (formation, conseil, gestion de projet, autres prestations). Prévoir aussi la vente ponctuelle de **produits physiques**. Dans les services : gérer **partenariats et affiliations**.

**Instances de test :** Plusieurs instances de test **totalement indépendantes**, dont une pour les **potentiels clients** de la solution.

**Personnalisation :** Dès la conception, réfléchir à la possibilité (sous réserve de faisabilité) de personnaliser les instances selon les clients, pour éviter de tout refaire pour de petites customisations — modèle type **template**.

**Offre :** Très variée selon les services cités.

**Canal :** Mixte B2B / B2C.

**Zones géographiques :** France, pays francophones et toute l’Afrique (priorité Afrique francophone) ; élargissement court terme à la population anglophone.

**Devises :** Euro, Franc CFA (XOF), Dollar US ; autres devises possibles ultérieurement.

**Langues :** Base **français** ; possibilité de traduire le contenu en anglais ou autres langues de façon **automatique**.

---

## 2. Processus commercial, onboarding, delivery et parcours détaillé

- Étapes de pipeline **génériques** : `lead`, `qualified`, `proposal`, `negotiation`, `won`, `lost`.
- Vue **Kanban** pour les deals (plan + README).
- Liens deal → **projet** ; dates de clôture prévue / réelle ; probabilité ; valeur.
- **Documents** rattachés aux deals (et comptes, contacts, projets).
- Exemple d’automatisation : deal gagné → création de projet **et/ou** lancement d’un **onboarding**.
- Le contenu des étapes ou le process peut varier selon différents critères (**type d’offre** : formation / conseil–IA / dev / autre).

**Onboarding (clients / prospects)** : parcours administratif post–signature ou pré–kickoff — collecte des informations nécessaires, checklist documentaire, validations internes/externes, passage contrôlé vers la **gestion de projet** ou un **programme IA** ; notifications et historique dans le CRM.

**Programmes conseil / sensibilisation IA / implémentation IA** : une fois le **contrat entreprise** signé, le CRM supporte la **planification** (phases, jalons), le suivi des **prestations** (sessions de sensibilisation, ateliers, revues), les **livrables** et artefacts documentaires, et la traçabilité des **obligations contractuelles** — sans exécuter les charges IA chez le client (sauf intégrations ultérieures).

Enregistrement et qualification des **prospects, clients, partenaires, fournisseurs**, en interne ou via flux / formulaire externe.

**Documents commerciaux :** génération automatique de devis, contrats, factures, bons de commande (clients, partenaires, formateurs…) à partir de **templates** par catégorie. Possibilité de faire passer un devis en bon de commande et/ou facture ; brouillon de contrat → contrat définitif.

**Signature / validation :** valider ou signer processus, contrats, documents soumis à un client, partenaire, formateur… depuis leur **interface personnelle** et un **espace dédié sécurisé**. Chaque utilisateur a un accès personnel avec ses documents.

**Notifications :** notifier automatiquement (mail ou moyens simples) la réception ou soumission d’un document en interne ; envoi de devis/contrat à signer depuis l’application vers l’espace du destinataire.

**Tickets :** créer des tickets de support liés à un projet ou à un site/application dont vous avez la responsabilité (ex. **plateforme de formation distincte** hébergée hors de ce CRM).

---

## 3. Personas & rôles

- **Admin** : tous les droits sur l’application et la base, y compris données clients.
- **Membre de la société** (compta, commercial, direction, …) : tous les droits sur les documents **internes** à la société ; pas de vue des espaces des autres (clients, partenaires, …).
- **Clients / prospects** : accès et modification uniquement dans leur espace entreprise/personnel.
- **Partenaire** : idem, espace entreprise/personnel.
- **Testeur / visiteur** (tenant de test pour acheteurs potentiels de la solution) : **lecture seule** avec données de test injectées.

---

## 4. Parcours utilisateur détaillés

### Activité formation (parcours **administratifs** dans le CRM)

Les étapes ci-dessous se déroulent dans ce CRM ; l’**activation** des comptes ou droits sur le **LMS** pourra s’appuyer plus tard sur le **lien entre applications**, sans que le CRM ne devienne le back-office pédagogique.

- Prospect créé ou injecté via automatisation (formulaire externe, LinkedIn, …) ; complétion de la fiche contact professionnelle.
- **Entreprise** : devient client après signature et validation du **contrat entreprise**.
- **Formateur** : prospect injecté comme ci-dessus ; après validation/signature du **contrat formateur**, devient **partenaire**.
- Dans les deux cas : modifications ou **avenants** aux contrats ; import/export de documents liés au partenariat ; **tickets** avec numérotation par catégorie, suivi et mise à jour pour les deux parties.

### Programmes entreprise : conseil, sensibilisation et implémentation IA (parcours **administratifs** dans le CRM)

- **Entrée** : deal gagné + **contrat conseil / IA** signé → projet ou **programme** dédié (type d’engagement à typer : diagnostic, sensibilisation, roadmap, accompagnement implémentation…).
- **Pilotage** : jalons (ex. cadrage, ateliers, revues COMEX, mise en conformité documentaire), tâches, interactions, pièces jointes, validations clients.
- **Sortie** : clôture administrative du programme (**recette** documentaire, attestations si besoin) — le détail métier est à **scénariser** (voir §4 « À compléter »).

### Références déjà cadrées

- Briques : contacts, comptes, deals, projets, tâches, **interactions**, **messagerie**, documents, automatisation, recherche (README, schéma).

### À compléter (scénarios)

Avec prérequis, étapes, résultats attendus et cas limites :

- **Onboarding** : d’après signature à **kickoff** (données, documents, validations).
- **Programme IA entreprise** : de la **signature** à la **clôture** (sensibilisation → planification → suivi d’implémentation).
- Réclamation ou litige client
- Autres parcours critiques

---

## 5. Objets métier & champs

**Account**, **Contact**, **Deal**, **Project**, **Task** (sous-tâches), **Interaction** (email, appel, réunion, note), **Document**, **Notification**, **Message**, **AutomationRule**, **WorkflowLog**.

Pour le **volet IA / conseil entreprise** et l’**onboarding**, prévoir au minimum : distinction **type d’offre** ou **type de programme** (enum ou référentiel), éventuels **modèles de projet** (templates de phases/jalons), **checklists** d’onboarding (peut reposer sur tâches groupées ou entité dédiée — à trancher), **liens forts** contrat ↔ projet ↔ documents.

**Bibliothèque de phases proposée (brouillon métier)** : [reference-phases-types-programmes-crm.md](./reference-phases-types-programmes-crm.md) — catalogue détaillé et **noyau MVP** suggéré.

`Organization.settings` (JSON) pour extensions configurables.

Déduire les objets métier appropriés à partir des points 1 à 4.

---

## 6. Rapports & indicateurs

Indicateurs pertinents par rôle et fonction. Recherche globale / partielle selon avancement. Données structurées pour agrégations pipelines, tâches, projets. Vue **gestion de projet** (direction).

**Compléments** : suivi **onboarding** (délais, taux de complétion des étapes), santé des **programmes conseil–IA** (jalons, risques, marge temps), adoption des **livrables** côté client.

- **KPI obligatoires** : pipeline, conversion, délais moyens, charge par personne, etc.
- **Tableaux de bord** par rôle.
- **Exports** : format, fréquence, filtres (équipe, segment, période).

---

## 7. Intégrations obligatoires

- **Webhooks sortants** et automatisation (ex. Make / n8n, LinkedIn, Gmail…).
- **Auth et stockage Supabase**.

Liste **contractuelle** des intégrations : pour chacune — outil cible, **événements** déclencheurs, sens des données (CRM ↔ outil). Simplifier au maximum le code interne.

**Liaison CRM ↔ application de formation (LMS)** : à traiter en **phase ultérieure** ; anticiper côté CRM des **identifiants externes**, webhooks sortants ou points d’extension pour ne pas bloquer l’évolution.

À cadrer : messagerie (Gmail / Outlook / autre), calendrier, téléphonie / click-to-call, WhatsApp Business, comptabilité, scénarios Make/n8n en production.

---

## 8. Contraintes non fonctionnelles

UX la plus simple et interactive possible.

- Architecture **multi-tenant**, isolation par organisation, **JWT Supabase**.
- Hébergement type : Supabase cloud + API / front selon la stack.
- **Journal d’activité / logs** pour l’admin.
- **RGPD** : bases légales, conservation, anonymisation, accès / effacement, registre des traitements si besoin ; cookies.
- **Localisation des données** (UE, Afrique, exigences clients).
- Disponibilité, charge, performance, accessibilité.
- **Mode hors ligne** : à trancher (requis ou non).

---

## 9. Périmètre & priorités

- **MVP métier** : maximum de fonctionnalités **administratives** du présent cahier ; éléments très contraignants/complexes (ex. **automatisations** avancées) peuvent aller en **second temps**.
- **Phase 2 / 3** : automatisations ; **interconnexion** avec l’application de formation (LMS) lorsque le socle CRM est stable.
- **Hors périmètre explicite (ce CRM)** : exploitation opérationnelle de la formation en ligne sur le LMS **séparé** (publication vidéos, gestion pédagogique jour le jour, espaces « produit formation » tels que conçus dans le LMS, etc.) ; **exécution technique** des charges d’IA, hébergement modèles ou workloads MLOps **chez le client** (sauf suivi **contractuel** et **reporting** dans le CRM).

---

## Historique des mises à jour (optionnel)

| Date       | Auteur | Changement                                      |
|------------|--------|-------------------------------------------------|
| _à compléter_ | …   | Import Mai 2026 depuis PDF personnel.           |
| 2026-05-08 | — | Précision périmètre : LMS distinct, CRM administratif, liaison phase ultérieure. |
| 2026-05-08 | — | Ajout : onboarding ; pilier « conseil / sensibilisation IA / implémentation IA » ; processus commerciaux + gestion de projet + onboarding comme cœur du CRM. |
