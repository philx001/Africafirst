# Référence — Phases types pour le CRM Africa First

Document de **proposition** pour structurer projets et programmes **dans le CRM** (jalons, livrables, validations, documents). Il ne décrit pas l’exécution technique (LMS, entraînement de modèles, MLOps) : uniquement le **pilotage administratif** et la **traçabilité contractuelle**.

**Utilisation prévue :** modèles de **projet** ou **checklists** (tâches groupées), éventuellement typées par **nature d’offre** (`formation_admin`, `conseil_ia`, `dev_automation`, etc.). Tout le catalogue **n’a pas** à être implémenté dès le MVP : voir fin de document pour un **noyau minimal**.

---

## 1. Principes

| Principe | Détail |
|----------|--------|
| **Phase** | Regroupement métier avec **objectif**, **livrables** attendus, **critères de sortie** (gate) documentés dans le CRM. |
| **Gate** | Validation explicite (interne, client, ou les deux selon contrat) avant phase suivante — **optionnelle** si la phase est marquée « sautée » ou « non applicable ». |
| **Livrable** | Pièce ou artefact traçable : compte-rendu, présentation, rapport, grille de risques, planning, PV de réunion, etc. (référencé comme **Document** ou tâche avec pièce jointe). |
| **Flexible** | Les intitulés peuvent être **renommés** ou **fusionnés** selon le client ; certaines phases peuvent être **sautées** ou **itérées** (le CRM conserve l’historique). |

### 1.1 Saut d’étapes (section 3 et au-delà) — sans casser les workflows

**Validé métier :** pour la partie **3. Programme entreprise — IA** (et, si besoin, les autres sections), **toute sous-phase peut être ignorée ou sautée** si tu le décides pour un client ou une mission.

Pour que cela **ne perturbe pas** les workflows dans le futur produit :

- Les phases du référentiel sont une **bibliothèque**, pas une **séquence rigide** : un projet ne porte que les **phases instanciées** (ou les tâches générées à partir du modèle choisi).
- Un **saut** se matérialise par : absence d’instance, statut **`skipped` / `not_applicable`**, ou **reconfiguration** du modèle avant lancement — **pas** par des identifiants de phases obligatoires en dur dans le code.
- Les **gates** ne bloquent la suite **que** pour les phases **réellement présentes** dans le projet ; si la phase N n’existe pas, le workflow passe de N−1 à N+1 sans erreur logique.
- L’**historique** (audit, dates, commentaire « phase volontairement omise ») reste possible pour la traçabilité contractuelle.

### 1.2 Deux activités majeures — toujours les volets **commercial** et **projet**

Que la mission soit plutôt **formation (admin autour du LMS)** ou **conseil / sensibilisation / implémentation IA**, le CRM couvre **en parallèle** :

1. **Gestion commerciale** — comptes, contacts, **deals**, pipeline, documents **avant / pendant** la vente, transition `won` → livraison.
2. **Gestion de projet & onboarding** — **projets**, **tâches**, jalons / livrables, onboarding (§2), puis phases métier (§3 ou §4 selon l’offre).

Les tableaux §3 et §4 décrivent surtout la **moitié « delivery »** ; ils **complètent** le pipeline commercial (Kanban deals, etc.), ils ne le remplacent pas.

---

## 2. Onboarding client / prospect (transversal)

S’applique après **signature** (ou début de période d’essai contractuelle) avant le **kickoff** métier du programme principal. Objectif : réduire les frictions et sécuriser les prérequis **documentaires et organisationnels**.

| # | Phase | Objectif | Activités types (admin CRM) | Livrables / preuves fréquentes | Gate de sortie |
|---|--------|----------|-----------------------------|--------------------------------|----------------|
| O1 | **Accueil & point de contact** | Identifier les interlocuteurs et canaux | Création fiches contacts, rôle RACI léger, planification call accueil | Message de bienvenue, CR **accueil** | Interlocuteurs principaux validés |
| O2 | **Collecte informations légales & facturation** | Aligner données contractantes | Saisie / vérification SIRET, TVA, adresses, bons de commande | Fiches compte à jour, **document** mandat si besoin | Données suffisantes pour facturation |
| O3 | **Accès & confidentialité** | Formaliser NDA / accès données | Suivi signature NDA, registre accès (liste dans CRM ou doc) | NDA signé, **politique de partage** | Accès autorisé aux **zones** prévues |
| O4 | **Calendrier & disponibilités** | Cadrer rythme et contraintes client | Agendas : créneaux récurrents, jours fermés, fuseaux | **Planning collaboratif** validé | Créneaux pour **kickoff** réservés |
| O5 | **Pré-requis données & systèmes** | Éviter blocages plus tard | Questionnaire : sources de données existantes, outils (messagerie, CRM client…), contraintes SI | **Questionnaire rempli**, inventaire simplifié | Validation client « prérequis **minimum** atteints » ou plan d’actions annexé |
| O6 | **Kickoff administratif** | Lancer officiellement la livraison | Réunion de lancement : périmètre rappelé, phases présentées, risques initiaux | **PV de kickoff**, **plan de phase** (MEP haut niveau) | Go formalisé pour **phase 1 du programme** |

> **Note MVP :** O2, O4, O6 suffisent souvent pour démarrer ; O3/O5 se renforcent dès que les dossiers deviennent sensibles (données perso, IA).

---

## 3. Programme entreprise — Conseil, sensibilisation & implémentation IA

Référence **complète** (parcours « mature »). En pratique, un même contrat peut **enchaîner** un sous-ensemble (ex. seulement sensibilisation + feuille de route, ou seulement audit + accompagnement ciblé). **Toute sous-phase peut être omise ou sautée** : règles de non-régression des workflows — **§1.1**.

Ce volet **s’articule toujours** avec la **gestion commerciale** (comptes, contacts, deals, signature) et avec la **gestion de projet / onboarding** une fois la vente actée — **§1.2**.

### 3.1 Phase 0 — Cadrage & faisabilité (pré-projet ou début contrat)

| # | Phase | Objectif | Activités types | Livrables | Gate |
|---|--------|----------|-----------------|-----------|------|
| IA0.1 | **Alignement objectifs & périmètre** | Traduire le contrat en périmètre opérationnel | Atelier direction / sponsor ; matrice objectifs / indicateurs de succès | **Note de cadrage** v1 | Sponsor valide périmètre |
| IA0.2 | **Cartographie parties prenantes** | Identifier décideurs, métiers, DSI, juridique, RSSI | Org chart influence ; points de friction | **Matrice parties prenantes** | Points de contact nommés |
| IA0.3 | **Hypothèses & contraintes** | Rendre explicites les cadres légaux et SI | RGPD, secteur régulé, cloud autorisé, fournisseurs IA autorisés ou non | **Registre d’hypothèses & contraintes** | Validation client sur hypothèses critiques |

### 3.2 Phase 1 — Sensibilisation & culture IA

| # | Phase | Objectif | Activités types | Livrables | Gate |
|---|--------|----------|-----------------|-----------|------|
| IA1.1 | **Prise de conscience (executive)** | Cadres comprénnent enjeux / risques / opportunités | Session « IA pour décideurs » (2–4 h), lexique commun | **Supports** + **CR** | Validation présence dirigeants / sponsors |
| IA1.2 | **Sensibilisation métiers & bonnes pratiques limites** | Réduire usages hasardeux (shadow IT, fuites de données) | Ateliers par population ; cas d’usage « interdits / à risque » | **Guide interne simplifié** (1–2 p.) | Leads métiers signent lecture ou formation faite |
| IA1.3 | **Éthique & conformité (vue intro)** | Poser les garde-fous | Rappel RGPD, propriété intellectuelle, biais | **Mini** `checklist` conformité | RSSI / juridique consultés si requis par contrat |

### 3.3 Phase 2 — Diagnostic & inventaire (maturité)

| # | Phase | Objectif | Activités types | Livrables | Gate |
|---|--------|----------|-----------------|-----------|------|
| IA2.1 | **Inventaire processus & données candidats** | Lister où l’IA peut aider (sans promouvoir une techno) | Entretiens, analyse **processus** à faible / haute valeur | **Cartographie processus × données** | Client valide complétude « raisonnable » |
| IA2.2 | **Audit maturité données & qualité** | Savoir si les données supportent les usages visés | Échantillons, règles qualité, silos | **Rapport maturité données** (synthèse) | Décision : « données exploitables **ou** plan de remédiation » |
| IA2.3 | **Audit maturité technique & intégrations** | Cadrer faisabilité SI | APIs, identité, hébergement, interconnexions | **Schéma SI simplifié** + écarts | DSI / IT valide lecture |
| IA2.4 | **Évaluation risques & cyber** | Identifier risques réputation / sécurité / conformité | Atelier risques ; classification données | **Grille risques** priorisée | Points rouges : plan de traitement ou **hors périmètre** explicite |

### 3.4 Phase 3 — Stratégie & priorisation

| # | Phase | Objectif | Activités types | Livrables | Gate |
|---|--------|----------|-----------------|-----------|------|
| IA3.1 | **Cas d’usage priorisés** | Choisir 3–7 candidats réalistes | Scoring : valeur, complexité, risque, données | **Backlog cas d’usage** | Comité de **priorisation** client |
| IA3.2 | **Feuille de route & budget** | Armer la gouvernance | Jalons trimestriels, budget capex/opex indicatif, sourcing interne/externe | **Roadmap IA** + **business case** léger | Sponsor approuve roadmap **ou** phase pilote unique |
| IA3.3 | **Modèle de gouvernance** | Qui décide quoi après le cabinet | Comité IA, rôles data owner, validation juridique | **Charte de gouvernance** v1 | Instance décisionnelle nommée |

### 3.5 Phase 4 — Design de la solution cible (haut niveau)

| # | Phase | Objectif | Activités types | Livrables | Gate |
|---|--------|----------|-----------------|-----------|------|
| IA4.1 | **Spécification métier des cas retenus** | Traduire le besoin sans verrouiller un fournisseur | User stories, critères d’acceptation **métier** | **Cahier des charges fonctionnel** cadré | Métier valide critères |
| IA4.2 | **Options d’architecture & sourcing** | Choisir approche : SaaS, API, modèle interne… | Comparatif fournisseurs / open / cloud | **Note d’options** + recommandation | Décision **architecture cible** |
| IA4.3 | **DPA / juridique & propriété intellectuelle** | Préparer contractualisation outils / données | Revue clauses, sous-traitants, transferts | **Liste exigences contractuelles** | Validation juridique client si contrat l’exige |

### 3.6 Phase 5 — Préparation & experimentation (pilote)

| # | Phase | Objectif | Activités types | Livrables | Gate |
|---|--------|----------|-----------------|-----------|------|
| IA5.1 | **Plan de pilote** | Définir périmètre minimal mesurable | Périmètre utilisateurs, durée, KPI, plan de rollback | **Plan de pilote** signé | Feu vert sponsor |
| IA5.2 | **Mise en environnement & accès** | Disposer des prérequis **administratifs** (comptes, accès, données de test) | Demandes d’accès ; traçabilité dans CRM | **Fiche des accès** (sans secrets en clair) | Accès validés |
| IA5.3 | **Exécution pilote (suivi)** | **Suivre** avancement (pas exécuter la technique dans le CRM) | Points d’étape hebdo/quinzadaire ; risques | **CR de suivi** ; **dashboard** KPI simple | Décision **poursuivre / ajuster / arrêter** |
| IA5.4 | **Recette métier & bilan** | Mesurer valeur & limites | Atelier bilan ; collecte retours | **Rapport de fin de pilote** | Décision scale ou itération |

### 3.7 Phase 6 — Déploiement élargi & change (vue CRM)

| # | Phase | Objectif | Activités types | Livrables | Gate |
|---|--------|----------|-----------------|-----------|------|
| IA6.1 | **Plan de déploiement** | Passer du pilote au périmètre élargi | Vagues, formation interne, support | **Plan de déploiement** | Budget & ressources validés |
| IA6.2 | **Formation & communication interne** | Adopter le nouvel outil/process | Sessions, FAQ, canal support | **Supports** ; **taux de participation** | Seuils définis dans le contrat |
| IA6.3 | **Suivi post-déploiement** | Consolidation & stabilisation | Hypercare ; tickets ; revues mensuelles | **Tableaux de suivi** ; **CR** | Période hypercare close |
| IA6.4 | **Revues gouvernance & amélioration continue** | Entretenir le dispositif | Comité IA trimestriel ; mise à jour risques | **PV comité** ; roadmap ajustée | Responsabilités **internes** pleinement assurées |

### 3.8 Phase 7 — Clôture administrative du programme

| # | Phase | Objectif | Activités types | Livrables | Gate |
|---|--------|----------|-----------------|-----------|------|
| IA7.1 | **Restitution finale** | Archivage contractuel | Dossier final indexé (rapports, PV, attestations) | **Dossier de clôture** | Client **accuse réception** |
| IA7.2 | **Enquête satisfaction & leçons apprises** | Capitaliser | Questionnaire NPS / qualité interne | **Synthèse** | Entrée en **comité amélioration** |
| IA7.3 | **Fin contrat prestation** | Lever les obligations résiduelles | Archivage données selon RGPD, destruction si prévu | **PV de fin de mission** | Facturation finale & archive |

---

## 4. Volet formation — administration autour du LMS (hors contenu pédagogique)

Le **contenu** et les **comptes apprenants** sont dans le **LMS**. Le CRM porte les **jalons contractuels** et la coordination.

**Rappel :** inclure systématiquement le **volet commercial** (pipeline, contrats) **et** le **volet projet** (F1–F4 + tâches) — **§1.2**.

| # | Phase | Objectif | Livrables / preuves (CRM) | Gate |
|---|--------|----------|---------------------------|------|
| F1 | **Onboarding entreprise cliente** | Idem §2 + contacts RH / référent formation | Contrat, annexes, liste participants attendus (si fournie) | Kickoff admin OK |
| F2 | **Paramétrage contractuel** | Formules, durées, nombre de licences / sessions | Bon de commande, avenants | Paramètres alignés avec finance |
| F3 | **Mise à disposition côté LMS (coordination)** | Suivi **demandes** d’ouverture d’espaces / comptes | Tickets ou **demandes traçables** ; dates cibles | Confirmation **LMS** (manuelle ou future intégration) |
| F4 | **Suivi de la relation & renouvellements** | Anticiper fin de période, upsell | Rapports d’avancement, PV de comité, échéances | Décision reconduction |

---

## 5. Prestations développement & automatisation (sur mesure)

Modèle plus **classique projet IT** dans le CRM.

| # | Phase | Objectif | Livrables types | Gate |
|---|--------|----------|-----------------|------|
| D1 | **Cadrage & expression de besoin** | Périmètre fonctionnel | Spec courte, backlog initial | Go développement |
| D2 | **Conception & maquettes** | Valider UX / flux | Maquettes, flux validés | Validation client |
| D3 | **Réalisation par itérations** | Livrer incréments | Releases notes, démos | Recette partielle |
| D4 | **Recette & mise en production** | Basculer en prod | PV recette, planning MEP | MEP validée |
| D5 | **Garde & transfert** | Stabilisation | Doc runbook, transfert support | Clôture ou contrat TMA |

---

## 6. Noyau recommandé pour un **premier déploiement** (sans tout charger)

Ordre **réaliste** pour un cabinet qui démarre, tout en restant **aligné vision** :

1. **Onboarding** : O2, O4, O6 (+ O5 si données sensibles).
2. **IA** (tronc court « découverte → décision ») : IA1.1 → IA2.1 → IA2.4 (allégé) → IA3.1 → IA3.2 → **IA5.1** (si pilote prévu au contrat) → IA7.1.
3. **Formation (admin)** : F1 → F2 → F3 (en mode suivi manuel).
4. **Dev** : D1 → D3 simplifié → D4 → D5.

Les phases **IA4.x** et **IA6.x** s’ajoutent quand les missions deviennes **implémentation lourde** ou **multi-sites**.

---

## 7. Évolution produit (hors périmètre immédiat)

- Attacher chaque phase à un **modèle de projet** (`template`) dans la base.
- Champs : `phase_code`, `ordre`, `obligatoire`, `délai_cible_jours`, `owners`.
- Tableau de bord : **phases en retard**, **gates en attente de signature**, **documents manquants**.

---

## Références croisées

- Vision produit : [cahier-des-charges-perso-mai-2026.md](./cahier-des-charges-perso-mai-2026.md)  
- Priorités MVP : [cahier-des-charges-gem-cursor-mai-2026.md](./cahier-des-charges-gem-cursor-mai-2026.md)

| Historique | |
|------------|--|
| 2026-05 | Création — proposition de bibliothèque de phases pour programmes IA, onboarding, formation admin, dev. |
| 2026-05 | Validation métier : **saut d’étapes** sans bloquer les workflows ; rappel **commercial + projet** pour les deux activités majeures. |
