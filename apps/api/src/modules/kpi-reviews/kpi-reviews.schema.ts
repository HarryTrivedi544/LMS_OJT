import { workflowStatuses } from "@lms/shared";
import { z } from "zod";

const uuidSchema = z.uuid();
const workflowStatusSchema = z.enum(workflowStatuses);
const reviewPeriodSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Review period must use YYYY-MM format.");

export const kpiScoreEntrySchema = z.object({
  criterion: z.string().trim().min(1).max(120),
  score: z.number().min(0).max(100),
  maxScore: z.number().min(1).max(100),
  notes: z.string().trim().max(1000).optional(),
});

export const listKpiReviewsSchema = z.object({
  query: z.object({
    programId: uuidSchema.optional(),
    batchId: uuidSchema.optional(),
    candidateId: uuidSchema.optional(),
    status: workflowStatusSchema.optional(),
    reviewPeriod: reviewPeriodSchema.optional(),
    includeArchived: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
  }),
});

export const getKpiReviewSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

export const createKpiReviewSchema = z.object({
  body: z.object({
    candidateId: uuidSchema,
    reviewPeriod: reviewPeriodSchema,
    scores: z.array(kpiScoreEntrySchema).min(1).max(20),
    feedback: z.string().trim().max(5000).optional(),
  }),
});

export const updateKpiReviewSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    scores: z.array(kpiScoreEntrySchema).min(1).max(20),
    feedback: z.string().trim().max(5000).optional(),
  }),
});

export const completeKpiReviewSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

export type ListKpiReviewsInput = z.infer<typeof listKpiReviewsSchema>["query"];
export type CreateKpiReviewInput = z.infer<typeof createKpiReviewSchema>["body"];
export type UpdateKpiReviewInput = z.infer<typeof updateKpiReviewSchema>["body"];
export type KpiScoreEntryInput = z.infer<typeof kpiScoreEntrySchema>;
