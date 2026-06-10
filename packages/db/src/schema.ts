import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", [
  "Super Admin",
  "Program Admin",
  "Program Lead",
  "Candidate",
]);

export const actorTypeEnum = pgEnum("actor_type", ["user", "system", "agent"]);

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "inactive",
  "suspended",
  "archived",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "in_app",
  "push",
]);

export const workflowStatusEnum = pgEnum("workflow_status", [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "revision_required",
  "overdue",
  "cancelled",
]);

const lifecycleColumns = {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  deletedBy: uuid("deleted_by"),
  isActive: boolean("is_active").notNull().default(true),
};

export const users = pgTable(
  "users",
  {
    ...lifecycleColumns,
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    role: roleEnum("role").notNull(),
    status: userStatusEnum("status").notNull().default("active"),
  },
  (table) => [
    uniqueIndex("users_email_unique_idx").on(table.email),
    index("users_status_idx").on(table.status),
    index("users_deleted_at_idx").on(table.deletedAt),
  ],
);

export const programs = pgTable(
  "programs",
  {
    ...lifecycleColumns,
    name: text("name").notNull(),
    code: text("code").notNull(),
    status: workflowStatusEnum("status").notNull().default("draft"),
  },
  (table) => [
    uniqueIndex("programs_code_unique_idx").on(table.code),
    index("programs_status_idx").on(table.status),
    index("programs_deleted_at_idx").on(table.deletedAt),
  ],
);

export const batches = pgTable(
  "batches",
  {
    ...lifecycleColumns,
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id),
    name: text("name").notNull(),
    code: text("code").notNull(),
    status: workflowStatusEnum("status").notNull().default("draft"),
  },
  (table) => [
    uniqueIndex("batches_code_unique_idx").on(table.code),
    index("batches_program_id_idx").on(table.programId),
    index("batches_status_idx").on(table.status),
    index("batches_deleted_at_idx").on(table.deletedAt),
  ],
);

export const candidates = pgTable(
  "candidates",
  {
    ...lifecycleColumns,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id),
    batchId: uuid("batch_id").references(() => batches.id),
    candidateCode: text("candidate_code").notNull(),
    status: userStatusEnum("status").notNull().default("active"),
  },
  (table) => [
    uniqueIndex("candidates_candidate_code_unique_idx").on(table.candidateCode),
    index("candidates_user_id_idx").on(table.userId),
    index("candidates_program_id_idx").on(table.programId),
    index("candidates_batch_id_idx").on(table.batchId),
    index("candidates_status_idx").on(table.status),
    index("candidates_deleted_at_idx").on(table.deletedAt),
  ],
);

export const candidateLogs = pgTable(
  "candidate_logs",
  {
    ...lifecycleColumns,
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id),
    logDate: date("log_date").notNull(),
    minutesSpent: integer("minutes_spent").notNull().default(0),
    entries: jsonb("entries").notNull().default([]),
    summary: text("summary").notNull(),
    blockers: text("blockers"),
    status: workflowStatusEnum("status").notNull().default("submitted"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewNote: text("review_note"),
  },
  (table) => [
    uniqueIndex("candidate_logs_candidate_log_date_unique_idx").on(
      table.candidateId,
      table.logDate,
    ),
    index("candidate_logs_candidate_id_idx").on(table.candidateId),
    index("candidate_logs_log_date_idx").on(table.logDate),
    index("candidate_logs_status_idx").on(table.status),
    index("candidate_logs_deleted_at_idx").on(table.deletedAt),
  ],
);

export const timesheets = pgTable(
  "timesheets",
  {
    ...lifecycleColumns,
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id),
    weekStartDate: date("week_start_date").notNull(),
    weekEndDate: date("week_end_date").notNull(),
    totalMinutes: integer("total_minutes").notNull().default(0),
    entries: jsonb("entries").notNull().default([]),
    status: workflowStatusEnum("status").notNull().default("submitted"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewNote: text("review_note"),
  },
  (table) => [
    uniqueIndex("timesheets_candidate_week_start_unique_idx").on(
      table.candidateId,
      table.weekStartDate,
    ),
    index("timesheets_candidate_id_idx").on(table.candidateId),
    index("timesheets_week_start_date_idx").on(table.weekStartDate),
    index("timesheets_status_idx").on(table.status),
    index("timesheets_deleted_at_idx").on(table.deletedAt),
  ],
);

export const programAssignments = pgTable(
  "program_assignments",
  {
    ...lifecycleColumns,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id),
    role: roleEnum("role").notNull(),
  },
  (table) => [
    uniqueIndex("program_assignments_user_program_role_unique_idx").on(
      table.userId,
      table.programId,
      table.role,
    ),
    index("program_assignments_user_id_idx").on(table.userId),
    index("program_assignments_program_id_idx").on(table.programId),
    index("program_assignments_role_idx").on(table.role),
    index("program_assignments_deleted_at_idx").on(table.deletedAt),
  ],
);

export const batchAssignments = pgTable(
  "batch_assignments",
  {
    ...lifecycleColumns,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => batches.id),
    role: roleEnum("role").notNull(),
  },
  (table) => [
    uniqueIndex("batch_assignments_user_batch_role_unique_idx").on(
      table.userId,
      table.batchId,
      table.role,
    ),
    index("batch_assignments_user_id_idx").on(table.userId),
    index("batch_assignments_batch_id_idx").on(table.batchId),
    index("batch_assignments_role_idx").on(table.role),
    index("batch_assignments_deleted_at_idx").on(table.deletedAt),
  ],
);

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("permissions_name_unique_idx").on(table.name)],
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    role: roleEnum("role").notNull(),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("role_permissions_role_permission_unique_idx").on(
      table.role,
      table.permissionId,
    ),
    index("role_permissions_role_idx").on(table.role),
    index("role_permissions_permission_id_idx").on(table.permissionId),
  ],
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("refresh_tokens_user_id_idx").on(table.userId),
    index("refresh_tokens_expires_at_idx").on(table.expiresAt),
  ],
);

export const domainEvents = pgTable(
  "domain_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventName: text("event_name").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    actorType: actorTypeEnum("actor_type").notNull(),
    actorId: uuid("actor_id"),
    payload: jsonb("payload").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("domain_events_event_name_idx").on(table.eventName),
    index("domain_events_entity_idx").on(table.entityType, table.entityId),
    index("domain_events_occurred_at_idx").on(table.occurredAt),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorType: actorTypeEnum("actor_type").notNull(),
    actorId: uuid("actor_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    metadata: jsonb("metadata").notNull().default({}),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_actor_idx").on(table.actorType, table.actorId),
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_timestamp_idx").on(table.timestamp),
  ],
);

export const evidenceRegistry = pgTable(
  "evidence_registry",
  {
    ...lifecycleColumns,
    candidateId: uuid("candidate_id").references(() => candidates.id),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    evidenceType: text("evidence_type").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [
    index("evidence_registry_candidate_id_idx").on(table.candidateId),
    index("evidence_registry_entity_idx").on(table.entityType, table.entityId),
    index("evidence_registry_deleted_at_idx").on(table.deletedAt),
  ],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    ...lifecycleColumns,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    channel: notificationChannelEnum("channel").notNull(),
    isEnabled: boolean("is_enabled").notNull().default(true),
  },
  (table) => [
    uniqueIndex("notification_preferences_user_channel_unique_idx").on(
      table.userId,
      table.channel,
    ),
    index("notification_preferences_user_id_idx").on(table.userId),
  ],
);

export const deviceTokens = pgTable(
  "device_tokens",
  {
    ...lifecycleColumns,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    provider: text("provider").notNull().default("firebase"),
    tokenHash: text("token_hash").notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("device_tokens_token_hash_unique_idx").on(table.tokenHash),
    index("device_tokens_user_id_idx").on(table.userId),
    index("device_tokens_deleted_at_idx").on(table.deletedAt),
  ],
);
