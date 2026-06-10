import { z } from "zod";

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export const apiSuccessSchema = <TData extends z.ZodType>(data: TData) =>
  z.object({
    success: z.literal(true),
    data,
  });

export const healthResponseSchema = apiSuccessSchema(
  z.object({
    service: z.literal("lms-api"),
    status: z.literal("ok"),
    timestamp: z.string(),
  }),
);

export const authUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  fullName: z.string(),
  role: z.enum(["Super Admin", "Program Admin", "Program Lead", "Candidate"]),
});

export const userManagementUserSchema = authUserSchema.extend({
  status: z.enum(["active", "inactive", "suspended", "archived"]),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

const workflowStatusSchema = z.enum([
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "revision_required",
  "overdue",
  "cancelled",
]);

export const programSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  status: workflowStatusSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const batchSchema = programSchema.extend({
  programId: z.string(),
});

export const assignmentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fullName: z.string(),
  email: z.email(),
  role: z.enum(["Program Admin", "Program Lead"]),
  createdAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const candidateSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fullName: z.string(),
  email: z.email(),
  programId: z.string(),
  programName: z.string(),
  programCode: z.string(),
  batchId: z.string().nullable(),
  batchName: z.string().nullable(),
  batchCode: z.string().nullable(),
  candidateCode: z.string(),
  status: z.enum(["active", "inactive", "suspended", "archived"]),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const candidateOptionsSchema = z.object({
  programs: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
    }),
  ),
  batches: z.array(
    z.object({
      id: z.string(),
      programId: z.string(),
      name: z.string(),
      code: z.string(),
    }),
  ),
});

export const candidateLogEntrySchema = z.object({
  taskReference: z.string(),
  taskDescription: z.string(),
  projectReference: z.string(),
  taskType: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  hours: z.number(),
  outputDelivered: z.string().optional(),
  toolTechnology: z.string(),
  status: z.string(),
  notesBlocker: z.string().optional(),
});

export const candidateLogSchema = z.object({
  id: z.string(),
  candidateId: z.string(),
  userId: z.string(),
  fullName: z.string(),
  email: z.email(),
  candidateCode: z.string(),
  programId: z.string(),
  programName: z.string(),
  batchId: z.string().nullable(),
  batchName: z.string().nullable(),
  logDate: z.string(),
  minutesSpent: z.number(),
  entries: z.array(candidateLogEntrySchema),
  summary: z.string(),
  blockers: z.string().nullable(),
  status: workflowStatusSchema,
  submittedAt: z.string(),
  reviewedAt: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  reviewNote: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const timesheetEntrySchema = z.object({
  workDate: z.string(),
  dayLabel: z.string(),
  hours: z.number(),
  minutes: z.number(),
  summary: z.string().optional(),
  blockers: z.string().optional(),
});

export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  body: z.string(),
  triggerName: z.string(),
  channel: z.enum(["email", "in_app", "push"]),
  readAt: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  emailSentAt: z.string().nullable(),
  createdAt: z.string(),
});

export const notificationPreferencesSchema = z.object({
  emailEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
});

export const chatRoomSchema = z.object({
  id: z.string(),
  candidateId: z.string(),
  userId: z.string(),
  fullName: z.string(),
  email: z.email(),
  candidateCode: z.string(),
  programId: z.string(),
  programName: z.string(),
  batchId: z.string().nullable(),
  batchName: z.string().nullable(),
  title: z.string(),
  lastMessageAt: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const chatMessageSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  senderUserId: z.string(),
  senderName: z.string(),
  body: z.string(),
  createdAt: z.string(),
});

export const callSchema = z.object({
  id: z.string(),
  candidateId: z.string(),
  userId: z.string(),
  fullName: z.string(),
  email: z.email(),
  candidateCode: z.string(),
  programId: z.string(),
  programName: z.string(),
  batchId: z.string().nullable(),
  batchName: z.string().nullable(),
  scheduledBy: z.string(),
  schedulerName: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  scheduledStartAt: z.string(),
  scheduledEndAt: z.string(),
  meetingLink: z.string().nullable(),
  status: workflowStatusSchema,
  cancelledAt: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const storedFileSchema = z.object({
  id: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  module: z.string(),
  ownerUserId: z.string(),
  candidateId: z.string().nullable(),
  isPrivate: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  downloadUrl: z.string().nullable(),
});

export const kpiScoreEntrySchema = z.object({
  criterion: z.string(),
  score: z.number(),
  maxScore: z.number(),
  notes: z.string().optional(),
});

export const kpiReviewSchema = z.object({
  id: z.string(),
  candidateId: z.string(),
  userId: z.string(),
  fullName: z.string(),
  email: z.email(),
  candidateCode: z.string(),
  programId: z.string(),
  programName: z.string(),
  batchId: z.string().nullable(),
  batchName: z.string().nullable(),
  reviewerId: z.string(),
  reviewerName: z.string(),
  reviewPeriod: z.string(),
  scores: z.array(kpiScoreEntrySchema),
  overallScore: z.number().nullable(),
  feedback: z.string().nullable(),
  status: workflowStatusSchema,
  completedAt: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  reviewNote: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const taskBriefSchema = z.object({
  id: z.string(),
  candidateId: z.string(),
  userId: z.string(),
  fullName: z.string(),
  email: z.email(),
  candidateCode: z.string(),
  programId: z.string(),
  programName: z.string(),
  batchId: z.string().nullable(),
  batchName: z.string().nullable(),
  assignedBy: z.string(),
  assignedByName: z.string(),
  title: z.string(),
  description: z.string(),
  taskReference: z.string().nullable(),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string().nullable(),
  status: workflowStatusSchema,
  acknowledgedAt: z.string().nullable(),
  submissionSummary: z.string().nullable(),
  submissionDeliverables: z.string().nullable(),
  submittedAt: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  reviewNote: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const timesheetSchema = z.object({
  id: z.string(),
  candidateId: z.string(),
  userId: z.string(),
  fullName: z.string(),
  email: z.email(),
  candidateCode: z.string(),
  programId: z.string(),
  programName: z.string(),
  batchId: z.string().nullable(),
  batchName: z.string().nullable(),
  weekStartDate: z.string(),
  weekEndDate: z.string(),
  totalMinutes: z.number(),
  entries: z.array(timesheetEntrySchema),
  status: workflowStatusSchema,
  submittedAt: z.string(),
  reviewedAt: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  reviewNote: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  tokenType: z.literal("Bearer"),
  expiresIn: z.literal("30m"),
  refreshTokenExpiresAt: z.string(),
  user: authUserSchema,
});

export const loginResponseSchema = apiSuccessSchema(authTokensSchema);
export const refreshResponseSchema = apiSuccessSchema(authTokensSchema);
export const listUsersResponseSchema = apiSuccessSchema(
  z.array(userManagementUserSchema),
);
export const userResponseSchema = apiSuccessSchema(userManagementUserSchema);
export const listProgramsResponseSchema = apiSuccessSchema(z.array(programSchema));
export const programResponseSchema = apiSuccessSchema(programSchema);
export const listBatchesResponseSchema = apiSuccessSchema(z.array(batchSchema));
export const batchResponseSchema = apiSuccessSchema(batchSchema);
export const listAssignmentsResponseSchema = apiSuccessSchema(
  z.array(assignmentSchema),
);
export const assignmentResponseSchema = apiSuccessSchema(assignmentSchema);
export const listCandidatesResponseSchema = apiSuccessSchema(
  z.array(candidateSchema),
);
export const candidateResponseSchema = apiSuccessSchema(candidateSchema);
export const candidateOptionsResponseSchema = apiSuccessSchema(
  candidateOptionsSchema,
);
export const listCandidateLogsResponseSchema = apiSuccessSchema(
  z.array(candidateLogSchema),
);
export const candidateLogResponseSchema = apiSuccessSchema(candidateLogSchema);
export const listTimesheetsResponseSchema = apiSuccessSchema(
  z.array(timesheetSchema),
);
export const timesheetResponseSchema = apiSuccessSchema(timesheetSchema);
export const listTaskBriefsResponseSchema = apiSuccessSchema(
  z.array(taskBriefSchema),
);
export const taskBriefResponseSchema = apiSuccessSchema(taskBriefSchema);
export const listKpiReviewsResponseSchema = apiSuccessSchema(
  z.array(kpiReviewSchema),
);
export const kpiReviewResponseSchema = apiSuccessSchema(kpiReviewSchema);
export const listStoredFilesResponseSchema = apiSuccessSchema(
  z.array(storedFileSchema),
);
export const storedFileResponseSchema = apiSuccessSchema(storedFileSchema);
export const listNotificationsResponseSchema = apiSuccessSchema(
  z.array(notificationSchema),
);
export const notificationResponseSchema = apiSuccessSchema(notificationSchema);
export const unreadCountResponseSchema = apiSuccessSchema(
  z.object({ count: z.number() }),
);
export const notificationPreferencesResponseSchema = apiSuccessSchema(
  notificationPreferencesSchema,
);
export const listChatRoomsResponseSchema = apiSuccessSchema(z.array(chatRoomSchema));
export const chatRoomResponseSchema = apiSuccessSchema(chatRoomSchema);
export const listChatMessagesResponseSchema = apiSuccessSchema(
  z.array(chatMessageSchema),
);
export const chatMessageResponseSchema = apiSuccessSchema(chatMessageSchema);
export const listCallsResponseSchema = apiSuccessSchema(z.array(callSchema));
export const callResponseSchema = apiSuccessSchema(callSchema);

export type ApiError = z.infer<typeof apiErrorSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type UserManagementUser = z.infer<typeof userManagementUserSchema>;
export type Program = z.infer<typeof programSchema>;
export type Batch = z.infer<typeof batchSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type Candidate = z.infer<typeof candidateSchema>;
export type CandidateOptions = z.infer<typeof candidateOptionsSchema>;
export type CandidateLogEntry = z.infer<typeof candidateLogEntrySchema>;
export type CandidateLog = z.infer<typeof candidateLogSchema>;
export type TimesheetEntry = z.infer<typeof timesheetEntrySchema>;
export type Timesheet = z.infer<typeof timesheetSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
export type StoredFile = z.infer<typeof storedFileSchema>;
export type KpiScoreEntry = z.infer<typeof kpiScoreEntrySchema>;
export type KpiReview = z.infer<typeof kpiReviewSchema>;
export type TaskBrief = z.infer<typeof taskBriefSchema>;
export type AuthTokens = z.infer<typeof authTokensSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
export type ListUsersResponse = z.infer<typeof listUsersResponseSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type ListProgramsResponse = z.infer<typeof listProgramsResponseSchema>;
export type ProgramResponse = z.infer<typeof programResponseSchema>;
export type ListBatchesResponse = z.infer<typeof listBatchesResponseSchema>;
export type BatchResponse = z.infer<typeof batchResponseSchema>;
export type ListAssignmentsResponse = z.infer<typeof listAssignmentsResponseSchema>;
export type AssignmentResponse = z.infer<typeof assignmentResponseSchema>;
export type ListCandidatesResponse = z.infer<typeof listCandidatesResponseSchema>;
export type CandidateResponse = z.infer<typeof candidateResponseSchema>;
export type CandidateOptionsResponse = z.infer<typeof candidateOptionsResponseSchema>;
export type ListCandidateLogsResponse = z.infer<
  typeof listCandidateLogsResponseSchema
>;
export type CandidateLogResponse = z.infer<typeof candidateLogResponseSchema>;
export type ListTimesheetsResponse = z.infer<typeof listTimesheetsResponseSchema>;
export type TimesheetResponse = z.infer<typeof timesheetResponseSchema>;
export type ListTaskBriefsResponse = z.infer<typeof listTaskBriefsResponseSchema>;
export type TaskBriefResponse = z.infer<typeof taskBriefResponseSchema>;
export type ListKpiReviewsResponse = z.infer<typeof listKpiReviewsResponseSchema>;
export type KpiReviewResponse = z.infer<typeof kpiReviewResponseSchema>;
export type ListStoredFilesResponse = z.infer<typeof listStoredFilesResponseSchema>;
export type StoredFileResponse = z.infer<typeof storedFileResponseSchema>;
export type ListNotificationsResponse = z.infer<typeof listNotificationsResponseSchema>;
export type NotificationResponse = z.infer<typeof notificationResponseSchema>;
export type UnreadCountResponse = z.infer<typeof unreadCountResponseSchema>;
export type NotificationPreferencesResponse = z.infer<
  typeof notificationPreferencesResponseSchema
>;
export type ChatRoom = z.infer<typeof chatRoomSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type Call = z.infer<typeof callSchema>;
export type ListChatRoomsResponse = z.infer<typeof listChatRoomsResponseSchema>;
export type ChatRoomResponse = z.infer<typeof chatRoomResponseSchema>;
export type ListChatMessagesResponse = z.infer<typeof listChatMessagesResponseSchema>;
export type ChatMessageResponse = z.infer<typeof chatMessageResponseSchema>;
export type ListCallsResponse = z.infer<typeof listCallsResponseSchema>;
export type CallResponse = z.infer<typeof callResponseSchema>;
