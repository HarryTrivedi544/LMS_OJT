import { workflowStatuses } from "@lms/shared";
import { z } from "zod";

const uuidSchema = z.uuid();
const workflowStatusSchema = z.enum(workflowStatuses);
const reviewPeriodSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Review period must use YYYY-MM format.");
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.");

const monthlyKpiCriterionKeys = [
  "attendance_time_discipline",
  "delivery_timeliness",
  "quality_of_work",
  "learning_progress",
  "communication",
  "ownership",
  "review_response",
  "team_contribution",
  "professional_conduct",
  "phase_readiness",
] as const;

const monthlyKpiCriterionKeySchema = z.enum(monthlyKpiCriterionKeys);

export const kpiScoreEntrySchema = z.object({
  key: monthlyKpiCriterionKeySchema,
  criterion: z.string().trim().min(1).max(120),
  score: z.number().min(0).max(10),
  maxScore: z.number().min(1).max(10),
  notes: z.string().trim().max(1000).optional(),
});

export const kpiAttendanceSummarySchema = z.object({
  monthlyTargetHours: z.number().min(0).max(744),
  actualHoursLogged: z.number().min(0).max(744),
  workingDaysAvailable: z.number().int().min(0).max(31).nullable(),
  daysAbsent: z.number().int().min(0).max(31),
  publicHolidays: z.number().int().min(0).max(31),
  nonAvailabilityDays: z.number().int().min(0).max(31),
  complianceStatus: z.enum(["full_compliance", "partial", "non_compliant"]),
});

export const kpiReviewSummarySchema = z.object({
  topStrengths: z.array(z.string().trim().min(1).max(250)).max(3),
  improvementAreas: z.array(z.string().trim().min(1).max(250)).max(3),
  notableAchievements: z.string().trim().max(4000).optional(),
  qualityIssues: z.string().trim().max(4000).optional(),
  feedbackResponse: z.string().trim().max(4000).optional(),
  conductConcerns: z.string().trim().max(4000).optional(),
});

export const kpiImprovementDirectiveSchema = z.object({
  criterionKey: monthlyKpiCriterionKeySchema,
  criterionLabel: z.string().trim().min(1).max(120),
  directive: z.string().trim().min(1).max(1000),
  measurementDeadline: z.string().trim().min(1).max(250),
});

export const kpiImprovementPlanSchema = z.object({
  pipConsideration: z.boolean().default(false),
  nextReviewDate: isoDateSchema.optional(),
  directives: z.array(kpiImprovementDirectiveSchema).max(10).default([]),
});

export const kpiPromotionSignalSchema = z.object({
  promotionWatch: z.boolean().default(false),
  readyForPromotion: z.boolean().default(false),
});

export const kpiFeeRecommendationSchema = z.object({
  decision: z.enum(["maintain", "increment", "hold"]),
  incrementAmount: z.number().min(0).max(1000000).nullable().optional(),
  justification: z.string().trim().max(2000).nullable().optional(),
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
    reviewDate: isoDateSchema,
    currentPhase: z.string().trim().min(1).max(120),
    currentDesignation: z.string().trim().min(1).max(120),
    programStartDate: isoDateSchema.optional(),
    monthsInCurrentPhase: z.number().int().min(0).max(240).optional(),
    attendanceSummary: kpiAttendanceSummarySchema,
    scores: z.array(kpiScoreEntrySchema).length(monthlyKpiCriterionKeys.length),
    summary: kpiReviewSummarySchema,
    improvementPlan: kpiImprovementPlanSchema,
    promotionSignal: kpiPromotionSignalSchema,
    feeRecommendation: kpiFeeRecommendationSchema.optional(),
    feedback: z.string().trim().max(5000).optional(),
  }),
});

export const updateKpiReviewSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    reviewDate: isoDateSchema,
    currentPhase: z.string().trim().min(1).max(120),
    currentDesignation: z.string().trim().min(1).max(120),
    programStartDate: isoDateSchema.optional(),
    monthsInCurrentPhase: z.number().int().min(0).max(240).optional(),
    attendanceSummary: kpiAttendanceSummarySchema,
    scores: z.array(kpiScoreEntrySchema).length(monthlyKpiCriterionKeys.length),
    summary: kpiReviewSummarySchema,
    improvementPlan: kpiImprovementPlanSchema,
    promotionSignal: kpiPromotionSignalSchema,
    feeRecommendation: kpiFeeRecommendationSchema.optional(),
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
export type KpiAttendanceSummaryInput = z.infer<typeof kpiAttendanceSummarySchema>;
export type KpiReviewSummaryInput = z.infer<typeof kpiReviewSummarySchema>;
export type KpiImprovementPlanInput = z.infer<typeof kpiImprovementPlanSchema>;
export type KpiPromotionSignalInput = z.infer<typeof kpiPromotionSignalSchema>;
export type KpiFeeRecommendationInput = z.infer<typeof kpiFeeRecommendationSchema>;
