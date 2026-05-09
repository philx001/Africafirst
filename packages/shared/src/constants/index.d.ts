export declare const DEAL_STAGES: readonly [{
    readonly id: "lead";
    readonly label: "Lead";
    readonly color: "#94a3b8";
}, {
    readonly id: "qualified";
    readonly label: "Qualifié";
    readonly color: "#60a5fa";
}, {
    readonly id: "proposal";
    readonly label: "Proposition";
    readonly color: "#a78bfa";
}, {
    readonly id: "negotiation";
    readonly label: "Négociation";
    readonly color: "#fb923c";
}, {
    readonly id: "won";
    readonly label: "Gagné";
    readonly color: "#4ade80";
}, {
    readonly id: "lost";
    readonly label: "Perdu";
    readonly color: "#f87171";
}];
export declare const PROJECT_STATUSES: readonly [{
    readonly id: "not_started";
    readonly label: "Non démarré";
    readonly color: "#94a3b8";
}, {
    readonly id: "in_progress";
    readonly label: "En cours";
    readonly color: "#60a5fa";
}, {
    readonly id: "on_hold";
    readonly label: "En pause";
    readonly color: "#fb923c";
}, {
    readonly id: "completed";
    readonly label: "Terminé";
    readonly color: "#4ade80";
}, {
    readonly id: "cancelled";
    readonly label: "Annulé";
    readonly color: "#f87171";
}];
export declare const TASK_STATUSES: readonly [{
    readonly id: "todo";
    readonly label: "À faire";
    readonly color: "#94a3b8";
}, {
    readonly id: "in_progress";
    readonly label: "En cours";
    readonly color: "#60a5fa";
}, {
    readonly id: "in_review";
    readonly label: "En révision";
    readonly color: "#a78bfa";
}, {
    readonly id: "done";
    readonly label: "Terminé";
    readonly color: "#4ade80";
}];
export declare const USER_ROLES: {
    readonly ADMIN: "admin";
    readonly MEMBER: "member";
    readonly CLIENT: "client";
};
export declare const PAGINATION_DEFAULTS: {
    readonly PAGE: 1;
    readonly LIMIT: 20;
    readonly MAX_LIMIT: 100;
};
export declare const SUPABASE_BUCKETS: {
    readonly DOCUMENTS: "documents";
    readonly AVATARS: "avatars";
};
export declare const AUTOMATION_TRIGGERS: readonly ["contact.created", "contact.updated", "deal.created", "deal.updated", "deal.stage_changed", "deal.won", "deal.lost", "project.created", "project.updated", "task.created", "task.updated", "task.completed"];
export declare const AUTOMATION_ACTIONS: readonly ["create_task", "create_notification", "send_webhook", "update_deal_stage", "create_project"];
export declare const RATE_LIMIT: {
    readonly AUTH_TTL: 60;
    readonly AUTH_LIMIT: 5;
    readonly API_TTL: 60;
    readonly API_LIMIT: 100;
};
