export const roles = [
  "Super Admin",
  "Program Admin",
  "Program Lead",
  "Candidate",
] as const;

export type Role = (typeof roles)[number];

export const workflowStatuses = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "revision_required",
  "overdue",
  "cancelled",
] as const;

export type WorkflowStatus = (typeof workflowStatuses)[number];

export const userStatuses = [
  "active",
  "inactive",
  "suspended",
  "archived",
] as const;

export type UserStatus = (typeof userStatuses)[number];

export const actorTypes = ["user", "system", "agent"] as const;

export type ActorType = (typeof actorTypes)[number];

export const notificationChannels = ["email", "in_app", "push"] as const;

export type NotificationChannel = (typeof notificationChannels)[number];

export const featureFlags = {
  aiFeatures: "AI_FEATURES_ENABLED",
  agentWorkflows: "AGENT_WORKFLOWS_ENABLED",
  mcpServer: "MCP_SERVER_ENABLED",
  pgvector: "PGVECTOR_ENABLED",
} as const;

export const domainEventNames = [
  "candidate.log.submitted",
  "timesheet.submitted",
  "timesheet.approved",
  "timesheet.rejected",
  "task.assigned",
  "task.acknowledged",
  "task.submitted",
  "kpi.review.completed",
  "call.scheduled",
  "chat.message.sent",
  "file.uploaded",
] as const;

export type DomainEventName = (typeof domainEventNames)[number];

export const notificationJobTypes = [
  "workflow",
  "daily_log_reminder",
  "weekly_timesheet_reminder",
] as const;

export type NotificationJobType = (typeof notificationJobTypes)[number];

export type WorkflowNotificationJob = {
  type: "workflow";
  userId: string;
  title: string;
  body: string;
  triggerName: string;
  metadata?: Record<string, unknown>;
};

export type DailyLogReminderJob = {
  type: "daily_log_reminder";
};

export type WeeklyTimesheetReminderJob = {
  type: "weekly_timesheet_reminder";
};

export type NotificationJobPayload =
  | WorkflowNotificationJob
  | DailyLogReminderJob
  | WeeklyTimesheetReminderJob;
