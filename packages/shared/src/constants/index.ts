// ============================================================
// Constantes partagées
// ============================================================

import type { OfferType, ProjectPhaseStatus } from '../types';

export const DEAL_STAGES = [
  { id: 'lead', label: 'Lead', color: '#94a3b8' },
  { id: 'qualified', label: 'Qualifié', color: '#60a5fa' },
  { id: 'proposal', label: 'Proposition', color: '#a78bfa' },
  { id: 'negotiation', label: 'Négociation', color: '#fb923c' },
  { id: 'won', label: 'Gagné', color: '#4ade80' },
  { id: 'lost', label: 'Perdu', color: '#f87171' },
] as const;

/** Types d'offre — pilotage admin (formation hors LMS, IA, dev, etc.) */
export const OFFER_TYPES: { id: OfferType; label: string }[] = [
  { id: 'generic', label: 'Non spécifié' },
  { id: 'formation_admin', label: 'Formation (pilotage administratif)' },
  { id: 'conseil_ia', label: 'Conseil, sensibilisation & implémentation IA' },
  { id: 'dev_automation', label: 'Développement & automatisation' },
  { id: 'produit_physique', label: 'Produit physique' },
  { id: 'partenariat', label: 'Partenariat / affiliation' },
  { id: 'autre', label: 'Autre prestation' },
];

export const OFFER_TYPE_VALUES: readonly OfferType[] = OFFER_TYPES.map((o) => o.id);

/** Secteurs d'activité standardisés pour les entreprises. */
export const ACCOUNT_INDUSTRIES: readonly { id: string; label: string }[] = [
  { id: 'agriculture', label: 'Agriculture, élevage, pêche' },
  { id: 'industrie', label: 'Industrie manufacturière' },
  { id: 'construction', label: 'Construction & BTP' },
  { id: 'energie', label: 'Énergie & utilities' },
  { id: 'transport-logistique', label: 'Transport & logistique' },
  { id: 'automobile', label: 'Automobile' },
  { id: 'aeronautique', label: 'Aéronautique & spatial' },
  { id: 'retail-ecommerce', label: 'Commerce, retail & e-commerce' },
  { id: 'hotellerie-restauration', label: 'Hôtellerie, restauration, tourisme' },
  { id: 'sante', label: 'Santé, pharmaceutique, medtech' },
  { id: 'education', label: 'Éducation & formation' },
  { id: 'finance-assurance', label: 'Banque, finance, assurance' },
  { id: 'immobilier', label: 'Immobilier' },
  { id: 'telecom', label: 'Télécoms' },
  { id: 'it-logiciels', label: 'IT, logiciels & services numériques' },
  { id: 'medias', label: 'Médias, communication & publicité' },
  { id: 'juridique-conseil', label: 'Juridique, conseil & services pro' },
  { id: 'rh-recrutement', label: 'RH & recrutement' },
  { id: 'secteur-public', label: 'Secteur public & administration' },
  { id: 'associations-ong', label: 'Associations, ONG, économie sociale' },
  { id: 'art-culture', label: 'Art, culture & événementiel' },
  { id: 'securite', label: 'Sécurité & défense' },
  { id: 'environnement', label: 'Environnement & gestion des déchets' },
  { id: 'autre', label: 'Autre' },
] as const;

/** Pays pour les sélecteurs (Afrique en priorité, tri alphabétique par groupe). */
const AFRICAN_COUNTRY_OPTIONS: readonly { code: string; label: string }[] = [
  { code: 'ZA', label: 'Afrique du Sud' },
  { code: 'DZ', label: 'Algérie' },
  { code: 'AO', label: 'Angola' },
  { code: 'BJ', label: 'Bénin' },
  { code: 'BW', label: 'Botswana' },
  { code: 'BF', label: 'Burkina Faso' },
  { code: 'BI', label: 'Burundi' },
  { code: 'CV', label: 'Cap-Vert' },
  { code: 'CM', label: 'Cameroun' },
  { code: 'KM', label: 'Comores' },
  { code: 'CG', label: 'Congo-Brazzaville' },
  { code: 'CD', label: 'Congo-Kinshasa' },
  { code: 'CI', label: "Côte d'Ivoire" },
  { code: 'DJ', label: 'Djibouti' },
  { code: 'EG', label: 'Égypte' },
  { code: 'ER', label: 'Érythrée' },
  { code: 'SZ', label: 'Eswatini' },
  { code: 'ET', label: 'Éthiopie' },
  { code: 'GA', label: 'Gabon' },
  { code: 'GM', label: 'Gambie' },
  { code: 'GH', label: 'Ghana' },
  { code: 'GN', label: 'Guinée' },
  { code: 'GW', label: 'Guinée-Bissau' },
  { code: 'GQ', label: 'Guinée équatoriale' },
  { code: 'KE', label: 'Kenya' },
  { code: 'LS', label: 'Lesotho' },
  { code: 'LR', label: 'Liberia' },
  { code: 'LY', label: 'Libye' },
  { code: 'MG', label: 'Madagascar' },
  { code: 'MW', label: 'Malawi' },
  { code: 'ML', label: 'Mali' },
  { code: 'MA', label: 'Maroc' },
  { code: 'MU', label: 'Maurice' },
  { code: 'MR', label: 'Mauritanie' },
  { code: 'MZ', label: 'Mozambique' },
  { code: 'NA', label: 'Namibie' },
  { code: 'NE', label: 'Niger' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'UG', label: 'Ouganda' },
  { code: 'CF', label: 'République centrafricaine' },
  { code: 'RW', label: 'Rwanda' },
  { code: 'ST', label: 'Sao Tomé-et-Principe' },
  { code: 'SN', label: 'Sénégal' },
  { code: 'SC', label: 'Seychelles' },
  { code: 'SL', label: 'Sierra Leone' },
  { code: 'SO', label: 'Somalie' },
  { code: 'SD', label: 'Soudan' },
  { code: 'SS', label: 'Soudan du Sud' },
  { code: 'TZ', label: 'Tanzanie' },
  { code: 'TD', label: 'Tchad' },
  { code: 'TG', label: 'Togo' },
  { code: 'TN', label: 'Tunisie' },
  { code: 'ZM', label: 'Zambie' },
  { code: 'ZW', label: 'Zimbabwe' },
];

const OTHER_COUNTRY_OPTIONS: readonly { code: string; label: string }[] = [
  { code: 'DE', label: 'Allemagne' },
  { code: 'SA', label: 'Arabie saoudite' },
  { code: 'AR', label: 'Argentine' },
  { code: 'AU', label: 'Australie' },
  { code: 'AT', label: 'Autriche' },
  { code: 'BE', label: 'Belgique' },
  { code: 'BR', label: 'Brésil' },
  { code: 'CA', label: 'Canada' },
  { code: 'CL', label: 'Chili' },
  { code: 'CN', label: 'Chine' },
  { code: 'CO', label: 'Colombie' },
  { code: 'KR', label: 'Corée du Sud' },
  { code: 'DK', label: 'Danemark' },
  { code: 'AE', label: 'Émirats arabes unis' },
  { code: 'ES', label: 'Espagne' },
  { code: 'US', label: 'États-Unis' },
  { code: 'FI', label: 'Finlande' },
  { code: 'FR', label: 'France' },
  { code: 'GR', label: 'Grèce' },
  { code: 'IN', label: 'Inde' },
  { code: 'ID', label: 'Indonésie' },
  { code: 'IE', label: 'Irlande' },
  { code: 'IS', label: 'Islande' },
  { code: 'IT', label: 'Italie' },
  { code: 'JP', label: 'Japon' },
  { code: 'LU', label: 'Luxembourg' },
  { code: 'MX', label: 'Mexique' },
  { code: 'NO', label: 'Norvège' },
  { code: 'NZ', label: 'Nouvelle-Zélande' },
  { code: 'NL', label: 'Pays-Bas' },
  { code: 'PE', label: 'Pérou' },
  { code: 'PL', label: 'Pologne' },
  { code: 'PT', label: 'Portugal' },
  { code: 'GB', label: 'Royaume-Uni' },
  { code: 'RO', label: 'Roumanie' },
  { code: 'SG', label: 'Singapour' },
  { code: 'SE', label: 'Suède' },
  { code: 'CH', label: 'Suisse' },
  { code: 'TR', label: 'Turquie' },
];

export const COUNTRY_OPTIONS: readonly { code: string; label: string }[] = [
  ...AFRICAN_COUNTRY_OPTIONS,
  ...OTHER_COUNTRY_OPTIONS,
  { code: 'autre', label: 'Autre' },
] as const;

/** Liste étendue des indicatifs internationaux (sélecteur manuel). */
export const PHONE_DIAL_CODES: readonly { code: string; label: string; dialCode: string }[] = [
  { code: 'AF', label: 'Afghanistan', dialCode: '+93' },
  { code: 'ZA', label: 'Afrique du Sud', dialCode: '+27' },
  { code: 'AL', label: 'Albanie', dialCode: '+355' },
  { code: 'DZ', label: 'Algérie', dialCode: '+213' },
  { code: 'DE', label: 'Allemagne', dialCode: '+49' },
  { code: 'AD', label: 'Andorre', dialCode: '+376' },
  { code: 'AO', label: 'Angola', dialCode: '+244' },
  { code: 'SA', label: 'Arabie saoudite', dialCode: '+966' },
  { code: 'AR', label: 'Argentine', dialCode: '+54' },
  { code: 'AM', label: 'Arménie', dialCode: '+374' },
  { code: 'AU', label: 'Australie', dialCode: '+61' },
  { code: 'AT', label: 'Autriche', dialCode: '+43' },
  { code: 'AZ', label: 'Azerbaïdjan', dialCode: '+994' },
  { code: 'BH', label: 'Bahreïn', dialCode: '+973' },
  { code: 'BD', label: 'Bangladesh', dialCode: '+880' },
  { code: 'BE', label: 'Belgique', dialCode: '+32' },
  { code: 'BJ', label: 'Bénin', dialCode: '+229' },
  { code: 'BY', label: 'Biélorussie', dialCode: '+375' },
  { code: 'BO', label: 'Bolivie', dialCode: '+591' },
  { code: 'BA', label: 'Bosnie-Herzégovine', dialCode: '+387' },
  { code: 'BW', label: 'Botswana', dialCode: '+267' },
  { code: 'BR', label: 'Brésil', dialCode: '+55' },
  { code: 'BG', label: 'Bulgarie', dialCode: '+359' },
  { code: 'BF', label: 'Burkina Faso', dialCode: '+226' },
  { code: 'BI', label: 'Burundi', dialCode: '+257' },
  { code: 'KH', label: 'Cambodge', dialCode: '+855' },
  { code: 'CM', label: 'Cameroun', dialCode: '+237' },
  { code: 'CA', label: 'Canada', dialCode: '+1' },
  { code: 'CV', label: 'Cap-Vert', dialCode: '+238' },
  { code: 'CL', label: 'Chili', dialCode: '+56' },
  { code: 'CN', label: 'Chine', dialCode: '+86' },
  { code: 'CY', label: 'Chypre', dialCode: '+357' },
  { code: 'CO', label: 'Colombie', dialCode: '+57' },
  { code: 'CG', label: 'Congo-Brazzaville', dialCode: '+242' },
  { code: 'CD', label: 'Congo-Kinshasa', dialCode: '+243' },
  { code: 'KR', label: 'Corée du Sud', dialCode: '+82' },
  { code: 'KP', label: 'Corée du Nord', dialCode: '+850' },
  { code: 'CR', label: 'Costa Rica', dialCode: '+506' },
  { code: 'CI', label: "Côte d'Ivoire", dialCode: '+225' },
  { code: 'HR', label: 'Croatie', dialCode: '+385' },
  { code: 'DK', label: 'Danemark', dialCode: '+45' },
  { code: 'DJ', label: 'Djibouti', dialCode: '+253' },
  { code: 'EG', label: 'Égypte', dialCode: '+20' },
  { code: 'AE', label: 'Émirats arabes unis', dialCode: '+971' },
  { code: 'EC', label: 'Équateur', dialCode: '+593' },
  { code: 'ES', label: 'Espagne', dialCode: '+34' },
  { code: 'EE', label: 'Estonie', dialCode: '+372' },
  { code: 'US', label: 'États-Unis', dialCode: '+1' },
  { code: 'ET', label: 'Éthiopie', dialCode: '+251' },
  { code: 'FI', label: 'Finlande', dialCode: '+358' },
  { code: 'FR', label: 'France', dialCode: '+33' },
  { code: 'GA', label: 'Gabon', dialCode: '+241' },
  { code: 'GM', label: 'Gambie', dialCode: '+220' },
  { code: 'GE', label: 'Géorgie', dialCode: '+995' },
  { code: 'GH', label: 'Ghana', dialCode: '+233' },
  { code: 'GR', label: 'Grèce', dialCode: '+30' },
  { code: 'GN', label: 'Guinée', dialCode: '+224' },
  { code: 'HT', label: 'Haïti', dialCode: '+509' },
  { code: 'HU', label: 'Hongrie', dialCode: '+36' },
  { code: 'IN', label: 'Inde', dialCode: '+91' },
  { code: 'ID', label: 'Indonésie', dialCode: '+62' },
  { code: 'IQ', label: 'Irak', dialCode: '+964' },
  { code: 'IR', label: 'Iran', dialCode: '+98' },
  { code: 'IE', label: 'Irlande', dialCode: '+353' },
  { code: 'IS', label: 'Islande', dialCode: '+354' },
  { code: 'IL', label: 'Israël', dialCode: '+972' },
  { code: 'IT', label: 'Italie', dialCode: '+39' },
  { code: 'JM', label: 'Jamaïque', dialCode: '+1' },
  { code: 'JP', label: 'Japon', dialCode: '+81' },
  { code: 'JO', label: 'Jordanie', dialCode: '+962' },
  { code: 'KZ', label: 'Kazakhstan', dialCode: '+7' },
  { code: 'KE', label: 'Kenya', dialCode: '+254' },
  { code: 'KW', label: 'Koweït', dialCode: '+965' },
  { code: 'LA', label: 'Laos', dialCode: '+856' },
  { code: 'LB', label: 'Liban', dialCode: '+961' },
  { code: 'LR', label: 'Liberia', dialCode: '+231' },
  { code: 'LY', label: 'Libye', dialCode: '+218' },
  { code: 'LT', label: 'Lituanie', dialCode: '+370' },
  { code: 'LU', label: 'Luxembourg', dialCode: '+352' },
  { code: 'MG', label: 'Madagascar', dialCode: '+261' },
  { code: 'MY', label: 'Malaisie', dialCode: '+60' },
  { code: 'ML', label: 'Mali', dialCode: '+223' },
  { code: 'MT', label: 'Malte', dialCode: '+356' },
  { code: 'MA', label: 'Maroc', dialCode: '+212' },
  { code: 'MR', label: 'Mauritanie', dialCode: '+222' },
  { code: 'MU', label: 'Maurice', dialCode: '+230' },
  { code: 'MX', label: 'Mexique', dialCode: '+52' },
  { code: 'MD', label: 'Moldavie', dialCode: '+373' },
  { code: 'MC', label: 'Monaco', dialCode: '+377' },
  { code: 'MN', label: 'Mongolie', dialCode: '+976' },
  { code: 'ME', label: 'Monténégro', dialCode: '+382' },
  { code: 'MZ', label: 'Mozambique', dialCode: '+258' },
  { code: 'NA', label: 'Namibie', dialCode: '+264' },
  { code: 'NP', label: 'Népal', dialCode: '+977' },
  { code: 'NI', label: 'Nicaragua', dialCode: '+505' },
  { code: 'NE', label: 'Niger', dialCode: '+227' },
  { code: 'NG', label: 'Nigeria', dialCode: '+234' },
  { code: 'NO', label: 'Norvège', dialCode: '+47' },
  { code: 'NZ', label: 'Nouvelle-Zélande', dialCode: '+64' },
  { code: 'OM', label: 'Oman', dialCode: '+968' },
  { code: 'UG', label: 'Ouganda', dialCode: '+256' },
  { code: 'UZ', label: 'Ouzbékistan', dialCode: '+998' },
  { code: 'PK', label: 'Pakistan', dialCode: '+92' },
  { code: 'PA', label: 'Panama', dialCode: '+507' },
  { code: 'PY', label: 'Paraguay', dialCode: '+595' },
  { code: 'NL', label: 'Pays-Bas', dialCode: '+31' },
  { code: 'PE', label: 'Pérou', dialCode: '+51' },
  { code: 'PH', label: 'Philippines', dialCode: '+63' },
  { code: 'PL', label: 'Pologne', dialCode: '+48' },
  { code: 'PT', label: 'Portugal', dialCode: '+351' },
  { code: 'QA', label: 'Qatar', dialCode: '+974' },
  { code: 'CF', label: 'République centrafricaine', dialCode: '+236' },
  { code: 'DO', label: 'République dominicaine', dialCode: '+1' },
  { code: 'CZ', label: 'République tchèque', dialCode: '+420' },
  { code: 'RO', label: 'Roumanie', dialCode: '+40' },
  { code: 'GB', label: 'Royaume-Uni', dialCode: '+44' },
  { code: 'RU', label: 'Russie', dialCode: '+7' },
  { code: 'RW', label: 'Rwanda', dialCode: '+250' },
  { code: 'SN', label: 'Sénégal', dialCode: '+221' },
  { code: 'RS', label: 'Serbie', dialCode: '+381' },
  { code: 'SG', label: 'Singapour', dialCode: '+65' },
  { code: 'SK', label: 'Slovaquie', dialCode: '+421' },
  { code: 'SI', label: 'Slovénie', dialCode: '+386' },
  { code: 'SD', label: 'Soudan', dialCode: '+249' },
  { code: 'LK', label: 'Sri Lanka', dialCode: '+94' },
  { code: 'SE', label: 'Suède', dialCode: '+46' },
  { code: 'CH', label: 'Suisse', dialCode: '+41' },
  { code: 'SY', label: 'Syrie', dialCode: '+963' },
  { code: 'TW', label: 'Taïwan', dialCode: '+886' },
  { code: 'TZ', label: 'Tanzanie', dialCode: '+255' },
  { code: 'TD', label: 'Tchad', dialCode: '+235' },
  { code: 'TH', label: 'Thaïlande', dialCode: '+66' },
  { code: 'TG', label: 'Togo', dialCode: '+228' },
  { code: 'TN', label: 'Tunisie', dialCode: '+216' },
  { code: 'TR', label: 'Turquie', dialCode: '+90' },
  { code: 'UA', label: 'Ukraine', dialCode: '+380' },
  { code: 'UY', label: 'Uruguay', dialCode: '+598' },
  { code: 'VE', label: 'Venezuela', dialCode: '+58' },
  { code: 'VN', label: 'Viêt Nam', dialCode: '+84' },
  { code: 'YE', label: 'Yémen', dialCode: '+967' },
  { code: 'ZM', label: 'Zambie', dialCode: '+260' },
  { code: 'ZW', label: 'Zimbabwe', dialCode: '+263' },
] as const;

/** Fonctions métiers fréquentes pour qualifier un contact. */
export const CONTACT_JOB_TITLES: readonly { id: string; label: string }[] = [
  { id: 'ceo', label: 'CEO / Directeur général' },
  { id: 'coo', label: 'COO / Directeur des opérations' },
  { id: 'cfo', label: 'CFO / Directeur financier' },
  { id: 'cto', label: 'CTO / Directeur technique' },
  { id: 'cmo', label: 'CMO / Directeur marketing' },
  { id: 'cro', label: 'Chief Revenue Officer' },
  { id: 'vp_sales', label: 'VP Sales / Directeur commercial' },
  { id: 'sales_manager', label: 'Responsable commercial' },
  { id: 'business_dev', label: 'Business Developer' },
  { id: 'account_manager', label: 'Account Manager' },
  { id: 'customer_success', label: 'Customer Success Manager' },
  { id: 'project_manager', label: 'Chef de projet' },
  { id: 'product_manager', label: 'Product Manager' },
  { id: 'operations_manager', label: 'Responsable opérations' },
  { id: 'procurement', label: 'Achats / Procurement' },
  { id: 'hr_manager', label: 'Responsable RH' },
  { id: 'it_manager', label: 'Responsable IT / SI' },
  { id: 'data_manager', label: 'Responsable data / BI' },
  { id: 'legal', label: 'Juriste / Legal' },
  { id: 'consultant', label: 'Consultant' },
  { id: 'assistant', label: 'Assistant / Office Manager' },
  { id: 'founder', label: 'Fondateur / Co-fondateur' },
  { id: 'other', label: 'Autre' },
] as const;

export const PROJECT_STATUSES = [
  { id: 'not_started', label: 'Non démarré', color: '#94a3b8' },
  { id: 'in_progress', label: 'En cours', color: '#60a5fa' },
  { id: 'on_hold', label: 'En pause', color: '#fb923c' },
  { id: 'completed', label: 'Terminé', color: '#4ade80' },
  { id: 'cancelled', label: 'Annulé', color: '#f87171' },
] as const;

/** Valeurs valides pour `ProjectPhase.status` (Prisma + DTO). */
export const PROJECT_PHASE_STATUS_VALUES: readonly ProjectPhaseStatus[] = [
  'pending',
  'in_progress',
  'completed',
  'skipped',
  'not_applicable',
] as const;

export const PROJECT_PHASE_STATUSES: { id: ProjectPhaseStatus; label: string; color: string }[] = [
  { id: 'pending', label: 'À faire', color: '#94a3b8' },
  { id: 'in_progress', label: 'En cours', color: '#60a5fa' },
  { id: 'completed', label: 'Terminé', color: '#4ade80' },
  { id: 'skipped', label: 'Ignoré', color: '#a78bfa' },
  { id: 'not_applicable', label: 'N/A', color: '#64748b' },
];

/** Gabarit par défaut instancié sur un projet via POST .../phases/bootstrap. */
export const DEFAULT_PROJECT_PHASE_TEMPLATES: readonly { key: string; label: string; sortOrder: number }[] = [
  { key: 'kickoff', label: 'Lancement & cadrage', sortOrder: 0 },
  { key: 'contract', label: 'Contrat & signature', sortOrder: 1 },
  { key: 'onboarding', label: 'Onboarding client', sortOrder: 2 },
  { key: 'delivery', label: 'Livraison & recette', sortOrder: 3 },
  { key: 'closure', label: 'Clôture & bilan', sortOrder: 4 },
];

export const TASK_STATUSES = [
  { id: 'todo', label: 'À faire', color: '#94a3b8' },
  { id: 'in_progress', label: 'En cours', color: '#60a5fa' },
  { id: 'in_review', label: 'En révision', color: '#a78bfa' },
  { id: 'done', label: 'Terminé', color: '#4ade80' },
] as const;

/** Statuts des tickets support — alignés Prisma `TicketStatus`. */
export const TICKET_STATUSES = [
  { id: 'open', label: 'Ouvert', color: '#94a3b8' },
  { id: 'in_progress', label: 'En cours', color: '#60a5fa' },
  { id: 'resolved', label: 'Résolu', color: '#4ade80' },
  { id: 'closed', label: 'Fermé', color: '#64748b' },
] as const;

/** SLA « première réponse » par priorité ticket (heures) — valeur plateforme par défaut. */
export type TicketPrioritySlaKey = 'low' | 'medium' | 'high' | 'urgent';

export const DEFAULT_TICKET_SLA_FIRST_RESPONSE_HOURS: Record<TicketPrioritySlaKey, number> = {
  low: 48,
  medium: 24,
  high: 8,
  urgent: 4,
};

/** SLA « résolution » (statut résolu ou fermé) depuis la création du ticket — défaut plateforme. */
export const DEFAULT_TICKET_SLA_RESOLUTION_HOURS: Record<TicketPrioritySlaKey, number> = {
  low: 168,
  medium: 72,
  high: 48,
  urgent: 24,
};

export const USER_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
  CLIENT: 'client',
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const SUPABASE_BUCKETS = {
  DOCUMENTS: 'documents',
  AVATARS: 'avatars',
} as const;

/** Devises officiellement supportées dans le CRM (P5). */
export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'XOF'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** Locales UI prioritaires (P5 base FR -> EN). */
export const SUPPORTED_LOCALES = ['fr-FR', 'en-US'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const AUTOMATION_TRIGGERS = [
  'contact.created',
  'contact.updated',
  'deal.created',
  'deal.updated',
  'deal.stage_changed',
  'deal.won',
  'deal.lost',
  'project.created',
  'project.updated',
  'task.created',
  'task.updated',
  'task.completed',
  'contract.signed',
  'contract.signature.provider_status_changed',
  'contract.signature.requested',
  'contract.signature.viewed',
  'contract.signature.declined',
  'contract.signature.failed',
] as const;

export const AUTOMATION_ACTIONS = [
  'create_task',
  'create_notification',
  'send_webhook',
  'update_deal_stage',
  'create_project',
] as const;

export const RATE_LIMIT = {
  AUTH_TTL: 60,       // secondes
  AUTH_LIMIT: 5,      // requêtes max par TTL
  API_TTL: 60,
  API_LIMIT: 100,
} as const;
