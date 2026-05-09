# Cahier des charges — CRM Africa First (version synthétique « Cursor », Mai 2026)

Source : export du PDF `Cahier des Charges_Gem.pdf`. Résumé orienté exécution et priorités pour le développement assisté.

---

## Conseils d’utilisation pour Cursor (méthode)

Avant de générer du code, priorités :

1. **Approche database-first** : ne pas commencer par l’UI ; produire d’abord le schéma SQL complet pour Supabase (tables, relations, index).
2. **Sécurité RLS (Row Level Security)** : appliquer immédiatement des politiques d’isolation par `organization_id` pour le multi-tenant.
3. **Priorité contractuelle** : fonctionnalité critique = tunnel **Devis → Contrat → Signature** ; enchaîner avec **onboarding** puis **gestion de projet** (y compris programmes **conseil / sensibilisation IA / implémentation IA** côté pilotage administratif).
4. **Interopérabilité** : dès que possible, prévoir des **webhooks sortants**, identifiants externes et contrats d’événements **réutilisables** pour brancher plus tard l’**application de formation (LMS)** — ex. contrat signé côté CRM → notification vers le LMS (**liaison complète CRM ↔ LMS = phase ultérieure**, à ne pas confondre avec le périmètre MVP).
5. **Simplicité vs customisation** : pour la personnalisation des instances, préférer des colonnes **JSONB** (ex. `Organization.settings`) plutôt que de multiplier les migrations structurelles par client.

---

## Cahier des charges : CRM Africa First (V3 — hub administratif)

### 1. Vision et contexte

- **Produit :** CRM multi-tenant (B2B/B2C) pour **administrer** : (1) **processus commerciaux**, (2) **gestion de projet**, (3) **onboarding** clients/prospects — plus contrats, documents, données commerciales/comptables.
- **Deux piliers métiers** (importance comparable) : **(A)** administration **autour de la formation** (contrats, relation formateurs/entreprises — le **LMS** reste l’app **opérationnelle** des cours) ; **(B)** **conseil**, **sensibilisation IA** et **planification / suivi de l’implémentation de l’IA** en entreprise (contrats signés, jalons, livrables, processus associés — **pas** l’exécution technique IA chez le client).
- **Plateforme de formation (LMS) :** **application distincte** ; vidéos, espaces Entreprises/Formateurs *produit formation*, utilisateurs apprenants.
- **Cible :** France, pays francophones et toute l’Afrique (priorité Afrique francophone).
- **Phase CRM ↔ LMS :** lien contrôlé ultérieurement (webhooks, identifiants externes) sans fusionner les responsabilités.

### 2. Onboarding & delivery (post–signature)

- **Onboarding** clients / prospects : collecte d’informations, checklists, validations, transition vers **projet** ou **programme**.
- **Delivery** : projets, tâches, interactions — y compris **programmes IA entreprise** (phases : cadrage, sensibilisation, roadmap, accompagnement — à cadrer métier).

### 3. Vente, pipeline et documents

- **Pipeline :** étapes `lead`, `qualified`, `proposal`, `negotiation`, `won`, `lost` via vue Kanban.
- **Cycle de vie documentaire :** génération automatique de devis, contrats et factures à partir de templates.
- **Transformations :** devis → bon de commande / facture ; brouillon → contrat définitif.
- **Signature électronique :** espace client sécurisé pour prospects, partenaires et formateurs.

### 4. Personas et rôles

- **Admin :** contrôle total application et données.
- **Membre de la société :** accès données internes (compta, commercial) selon les droits.
- **Clients / prospects :** espace personnel pour consulter/signer des documents.
- **Partenaires / formateurs :** espace dédié contrats et factures.
- **Testeur :** lecture seule sur instance de démonstration.

### 5. Objets métiers et données

- **Accounts & contacts** : entreprises et individus.
- **Deals** : opportunités avec valeur et probabilité (typer l’**offre** : formation / conseil–IA / dev…).
- **Projects & tasks** : après deal gagné — inclut **onboarding**, **programmes IA** (jalons, livrables) selon modèles métier.
- **Interactions** : historique mails, appels, réunions.
- **Tickets** : support client (services ou problèmes liés au LMS externe).
- **Settings (JSON)** : configuration flexible par organisation (templates de phase, checklists — évolutif).

### 6. Contraintes techniques et intégrations

- **Multilingue :** base français, traduction automatique possible (anglais).
- **Devises :** euro, dollar, franc CFA (XOF).
- **Stockage & auth :** services **Supabase**.
- **Automatisations :** Make/n8n via webhooks ; Gmail, LinkedIn, WhatsApp Business, etc.
- **Conformité :** RGPD (accès, effacement, cookies) ; localisation des données (contraintes africaines/européennes).

### 7. Périmètre du MVP

Le MVP couvre le **socle administratif** : données, deals, **onboarding** (version initiale), projets, **tunnel contractuel**. Les **workflows métiers fins** des programmes IA (tous les types de phases) et **l’interconnexion LMS** peuvent se **richir en itérations** ; prévoir dès le début `Organization.settings`, équivalents **type d’offre / programme**, et webhooks.

---

## Action type (rappel pour l’agent)

Générer / maintenir le schéma de base de données compatible Supabase pour les objets métiers cités, avec politiques **RLS** multi-tenant par organisation.
