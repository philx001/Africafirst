// ============================================================
// Types de base partagés entre frontend et backend
// ============================================================

export type UserRole = 'admin' | 'member' | 'client';

export type DealStage =
  | 'lead'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

/** Aligné sur le référentiel phases / types de programmes (CRM admin, hors LMS). */
export type OfferType =
  | 'generic'
  | 'formation_admin'
  | 'conseil_ia'
  | 'dev_automation'
  | 'produit_physique'
  | 'partenariat'
  | 'autre';

export type ProjectStatus =
  | 'not_started'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

/** Phase de jalonnement projet (onboarding administratif, distinct du LMS). */
export type ProjectPhaseStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'not_applicable';

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type InteractionType = 'email' | 'call' | 'meeting' | 'note';

export type NotificationType =
  | 'deal_updated'
  | 'task_assigned'
  | 'task_completed'
  | 'project_updated'
  | 'document_uploaded'
  | 'message_received'
  | 'automation_triggered'
  | 'mention'
  | 'contract_pending_signature'
  | 'contract_signed'
  | 'ticket_created'
  | 'ticket_assigned';

export type AutomationTrigger =
  | 'contact.created'
  | 'contact.updated'
  | 'deal.created'
  | 'deal.updated'
  | 'deal.stage_changed'
  | 'deal.won'
  | 'deal.lost'
  | 'project.created'
  | 'project.updated'
  | 'task.created'
  | 'task.updated'
  | 'task.completed'
  | 'contract.signed'
  | 'contract.signature.provider_status_changed'
  | 'contract.signature.requested'
  | 'contract.signature.viewed'
  | 'contract.signature.declined'
  | 'contract.signature.failed';

export type AutomationActionType =
  | 'create_task'
  | 'create_notification'
  | 'send_webhook'
  | 'update_deal_stage'
  | 'create_project';

export type PlanType = 'free' | 'starter' | 'pro' | 'enterprise';

// ============================================================
// Interfaces communes
// ============================================================

export interface BaseEntity {
  id: string;
  organizationId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

// ============================================================
// Payload JWT Supabase (custom claims)
// ============================================================

export interface SupabaseJwtPayload {
  sub: string;           // user id (Supabase auth.users.id)
  email: string;
  role: string;          // 'authenticated' (rôle Supabase)
  app_metadata: {
    organization_id: string;
    user_role: UserRole;   // rôle applicatif
    contact_id?: string;   // pour les clients du portail
  };
  iat: number;
  exp: number;
}

// ============================================================
// Contexte utilisateur (extrait du JWT, injecté dans les requêtes)
// ============================================================

export interface AuthUser {
  id: string;              // Supabase user id
  email: string;
  organizationId: string;
  role: UserRole;
  contactId?: string;      // uniquement pour role=client
}
