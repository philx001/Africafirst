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
