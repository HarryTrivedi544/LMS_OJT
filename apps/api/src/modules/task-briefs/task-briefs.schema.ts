import { workflowStatuses } from "@lms/shared";
import { z } from "zod";

const uuidSchema = z.uuid();
const workflowStatusSchema = z.enum(workflowStatuses);
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.");
const optionalTextSchema = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .nullish()
    .transform((value) => value || undefined);

export const listTaskBriefsSchema = z.object({
  query: z.object({
    programId: uuidSchema.optional(),
    batchId: uuidSchema.optional(),
    candidateId: uuidSchema.optional(),
    status: workflowStatusSchema.optional(),
    includeArchived: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
  }),
});

export const getTaskBriefSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

export const createTaskBriefSchema = z.object({
  body: z.object({
    candidateId: uuidSchema,
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(5000),
    taskReference: optionalTextSchema(100),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    dueDate: dateSchema.optional(),
  }),
});

export const acknowledgeTaskBriefSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

export const submitTaskBriefSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    submissionSummary: z.string().trim().min(1).max(5000),
    submissionDeliverables: optionalTextSchema(5000),
  }),
});

export const reviewTaskBriefSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    status: z.enum(["under_review", "approved", "rejected", "revision_required"]),
    reviewNote: z.string().trim().max(2000).optional(),
  }),
});

export type ListTaskBriefsInput = z.infer<typeof listTaskBriefsSchema>["query"];
export type CreateTaskBriefInput = z.infer<typeof createTaskBriefSchema>["body"];
export type SubmitTaskBriefInput = z.infer<typeof submitTaskBriefSchema>["body"];
export type ReviewTaskBriefInput = z.infer<typeof reviewTaskBriefSchema>["body"];
