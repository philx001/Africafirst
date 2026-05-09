export type UserRole = 'admin' | 'member' | 'client';
export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type ProjectStatus = 'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type InteractionType = 'email' | 'call' | 'meeting' | 'note';
export type NotificationType = 'deal_updated' | 'task_assigned' | 'task_completed' | 'project_updated' | 'document_uploaded' | 'message_received' | 'automation_triggered' | 'mention';
export type AutomationTrigger = 'contact.created' | 'contact.updated' | 'deal.created' | 'deal.updated' | 'deal.stage_changed' | 'deal.won' | 'deal.lost' | 'project.created' | 'project.updated' | 'task.created' | 'task.updated' | 'task.completed';
export type AutomationActionType = 'create_task' | 'create_notification' | 'send_webhook' | 'update_deal_stage' | 'create_project';
export type PlanType = 'free' | 'starter' | 'pro' | 'enterprise';
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
export interface SupabaseJwtPayload {
    sub: string;
    email: string;
    role: string;
    app_metadata: {
        organization_id: string;
        user_role: UserRole;
        contact_id?: string;
    };
    iat: number;
    exp: number;
}
export interface AuthUser {
    id: string;
    email: string;
    organizationId: string;
    role: UserRole;
    contactId?: string;
}
