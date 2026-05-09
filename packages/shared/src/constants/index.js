"use strict";
// ============================================================
// Constantes partagées
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.RATE_LIMIT = exports.AUTOMATION_ACTIONS = exports.AUTOMATION_TRIGGERS = exports.SUPABASE_BUCKETS = exports.PAGINATION_DEFAULTS = exports.USER_ROLES = exports.TASK_STATUSES = exports.PROJECT_STATUSES = exports.DEAL_STAGES = void 0;
exports.DEAL_STAGES = [
    { id: 'lead', label: 'Lead', color: '#94a3b8' },
    { id: 'qualified', label: 'Qualifié', color: '#60a5fa' },
    { id: 'proposal', label: 'Proposition', color: '#a78bfa' },
    { id: 'negotiation', label: 'Négociation', color: '#fb923c' },
    { id: 'won', label: 'Gagné', color: '#4ade80' },
    { id: 'lost', label: 'Perdu', color: '#f87171' },
];
exports.PROJECT_STATUSES = [
    { id: 'not_started', label: 'Non démarré', color: '#94a3b8' },
    { id: 'in_progress', label: 'En cours', color: '#60a5fa' },
    { id: 'on_hold', label: 'En pause', color: '#fb923c' },
    { id: 'completed', label: 'Terminé', color: '#4ade80' },
    { id: 'cancelled', label: 'Annulé', color: '#f87171' },
];
exports.TASK_STATUSES = [
    { id: 'todo', label: 'À faire', color: '#94a3b8' },
    { id: 'in_progress', label: 'En cours', color: '#60a5fa' },
    { id: 'in_review', label: 'En révision', color: '#a78bfa' },
    { id: 'done', label: 'Terminé', color: '#4ade80' },
];
exports.USER_ROLES = {
    ADMIN: 'admin',
    MEMBER: 'member',
    CLIENT: 'client',
};
exports.PAGINATION_DEFAULTS = {
    PAGE: 1,
    LIMIT: 20,
    MAX_LIMIT: 100,
};
exports.SUPABASE_BUCKETS = {
    DOCUMENTS: 'documents',
    AVATARS: 'avatars',
};
exports.AUTOMATION_TRIGGERS = [
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
];
exports.AUTOMATION_ACTIONS = [
    'create_task',
    'create_notification',
    'send_webhook',
    'update_deal_stage',
    'create_project',
];
exports.RATE_LIMIT = {
    AUTH_TTL: 60, // secondes
    AUTH_LIMIT: 5, // requêtes max par TTL
    API_TTL: 60,
    API_LIMIT: 100,
};
