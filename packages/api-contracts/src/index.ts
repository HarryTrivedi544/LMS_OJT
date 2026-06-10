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
