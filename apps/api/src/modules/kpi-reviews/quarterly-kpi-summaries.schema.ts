import { workflowStatuses } from "@lms/shared";
import { z } from "zod";

const uuidSchema = z.uuid();
const workflowStatusSchema = z.enum(workflowStatuses);
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.");

const quarterlyOutcomeSchema = z.enum([
  "on_track",
  "on_track_with_support",
  "needs_improvement_plan",
  "promotion_track_candidate",
  "not_ready_for_promotion_track",
]);

const stringListItem = z.string().trim().min(1).max(250);

export const listQuarterlyKpiSummariesSchema = z.object({
  query: z.object({
    programId: uuidSchema.optional(),
    batchId: uuidSchema.optional(),
    candidateId: uuidSchema.optional(),
    status: workflowStatusSchema.optional(),
    reviewYear: z.coerce.number().int().min(2000).max(2100).optional(),
    reviewQuarter: z.coerce.number().int().min(1).max(4).optional(),
    includeArchived: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
  }),
});

export const getQuarterlyKpiSummarySchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

const quarterlyAssessmentSchema = z.object({
  technicalGrowthSummary: z.string().trim().max(3000).optional(),
  deliveryConsistencySummary: z.string().trim().max(3000).optional(),
  communicationCollaborationSummary: z.string().trim().max(3000).optional(),
  ownershipIndependenceSummary: z.string().trim().max(3000).optional(),
  reviewResponsivenessSummary: z.string().trim().max(3000).optional(),
  riskFlags: z.string().trim().max(3000).optional(),
  strengths: z.array(stringListItem).max(3),
  improvementPriorities: z.array(stringListItem).max(3),
  recommendedFocus: z.string().trim().max(3000).optional(),
});

const quarterlyActionPlanSchema = z.object({
  nextQuarterGoals: z.string().trim().max(3000).optional(),
  expectedSkillImprovements: z.string().trim().max(3000).optional(),
  expectedDeliveryImprovements: z.string().trim().max(3000).optional(),
  supportRequired: z.string().trim().max(3000).optional(),
  followUpDate: isoDateSchema.optional(),
});

export const createQuarterlyKpiSummarySchema = z.object({
  body: z.object({
    candidateId: uuidSchema,
    reviewYear: z.number().int().min(2000).max(2100),
    reviewQuarter: z.number().int().min(1).max(4),
    reviewDate: isoDateSchema,
    currentPhase: z.string().trim().min(1).max(120),
    currentDesignation: z.string().trim().min(1).max(120),
    assessment: quarterlyAssessmentSchema,
    actionPlan: quarterlyActionPlanSchema,
    outcome: quarterlyOutcomeSchema.optional(),
    feedback: z.string().trim().max(5000).optional(),
  }),
});

export const updateQuarterlyKpiSummarySchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    reviewDate: isoDateSchema,
    currentPhase: z.string().trim().min(1).max(120),
    currentDesignation: z.string().trim().min(1).max(120),
    assessment: quarterlyAssessmentSchema,
    actionPlan: quarterlyActionPlanSchema,
    outcome: quarterlyOutcomeSchema.optional(),
    feedback: z.string().trim().max(5000).optional(),
  }),
});

export const completeQuarterlyKpiSummarySchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

export type ListQuarterlyKpiSummariesInput = z.infer<
  typeof listQuarterlyKpiSummariesSchema
>["query"];
export type CreateQuarterlyKpiSummaryInput = z.infer<
  typeof createQuarterlyKpiSummarySchema
>["body"];
export type UpdateQuarterlyKpiSummaryInput = z.infer<
  typeof updateQuarterlyKpiSummarySchema
>["body"];
