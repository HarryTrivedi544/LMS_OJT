import { workflowStatuses } from "@lms/shared";
import { z } from "zod";

const uuidSchema = z.uuid();
const workflowStatusSchema = z.enum(workflowStatuses);
const logDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.");
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:MM format.");

export const candidateLogEntrySchema = z.object({
  taskReference: z.string().trim().min(1).max(80),
  taskDescription: z.string().trim().min(1).max(500),
  projectReference: z.string().trim().min(1).max(160),
  taskType: z.string().trim().min(1).max(80),
  startTime: timeSchema,
  endTime: timeSchema,
  outputDelivered: z.string().trim().max(500).optional(),
  toolTechnology: z.string().trim().min(1).max(200),
  status: z.string().trim().min(1).max(80),
  notesBlocker: z.string().trim().max(500).optional(),
});

export const listCandidateLogsSchema = z.object({
  query: z.object({
    candidateId: uuidSchema.optional(),
    status: workflowStatusSchema.optional(),
    logDate: logDateSchema.optional(),
    includeArchived: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
  }),
});

export const createCandidateLogSchema = z.object({
  body: z.object({
    candidateId: uuidSchema.optional(),
    logDate: logDateSchema,
    entries: z.array(candidateLogEntrySchema).min(1).max(20),
  }),
});

export const reviewCandidateLogSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    status: z.enum(["under_review", "approved", "rejected", "revision_required"]),
    reviewNote: z.string().trim().max(2000).optional(),
  }),
});

export const candidateLogIdParamSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

export type ListCandidateLogsInput = z.infer<
  typeof listCandidateLogsSchema
>["query"];
export type CreateCandidateLogInput = z.infer<
  typeof createCandidateLogSchema
>["body"];
export type CandidateLogEntryInput = z.infer<typeof candidateLogEntrySchema>;
export type ReviewCandidateLogInput = z.infer<
  typeof reviewCandidateLogSchema
>["body"];
