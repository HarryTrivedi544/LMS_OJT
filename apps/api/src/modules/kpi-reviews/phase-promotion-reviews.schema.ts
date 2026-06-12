import { workflowStatuses } from "@lms/shared";
import { z } from "zod";

const uuidSchema = z.uuid();
const workflowStatusSchema = z.enum(workflowStatuses);
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.");

const phasePromotionCaseTypeSchema = z.enum(["normal_eligibility", "exception_case"]);
const phasePromotionProgramAdminDecisionSchema = z.enum([
  "recommend_approval",
  "recommend_rejection",
  "revision_required",
]);
const phasePromotionSuperAdminDecisionSchema = z.enum([
  "approved",
  "rejected",
  "revision_required",
]);

const listItemSchema = z.string().trim().min(1).max(250);

const phasePromotionEvidenceSchema = z.object({
  qualityReworkSummary: z.string().trim().max(3000).optional(),
  leadReviewSummary: z.string().trim().max(3000).optional(),
  keyProjectsCompleted: z.array(listItemSchema).max(5),
  skillsDemonstrated: z.array(listItemSchema).max(8),
  independentDeliveryEvidence: z.string().trim().max(3000).optional(),
  mentoringLeadershipSignals: z.string().trim().max(3000).optional(),
  repositoryLinks: z.array(z.string().trim().url()).max(5),
  supportingFileIds: z.array(uuidSchema).max(10),
});

const eligibilityChecklistItemSchema = z.object({
  criterionKey: z.string().trim().min(1).max(80),
  criterionLabel: z.string().trim().min(1).max(160),
  isMet: z.boolean(),
  evidence: z.string().trim().max(2000).optional(),
});

const leadRecommendationSchema = z.object({
  recommendation: z.enum(["promote", "promote_with_conditions", "hold"]),
  summary: z.string().trim().max(4000).optional(),
  conditions: z.string().trim().max(4000).optional(),
  initialAssignmentNextPhase: z.string().trim().max(2000).optional(),
});

const phasePromotionBaseBodySchema = z
  .object({
    preparedDate: isoDateSchema,
    currentPhase: z.string().trim().min(1).max(120),
    currentDesignation: z.string().trim().min(1).max(120),
    proposedNextPhase: z.string().trim().min(1).max(120),
    proposedNextDesignation: z.string().trim().min(1).max(120),
    currentMonthlyFee: z.number().int().min(0).optional(),
    proposedMonthlyFee: z.number().int().min(0).optional(),
    currentPhaseStartDate: isoDateSchema.optional(),
    monthsInCurrentPhase: z.number().int().min(0).max(240).optional(),
    promotionEffectiveDate: isoDateSchema,
    promotionCycleType: z.string().trim().min(1).max(120),
    caseType: phasePromotionCaseTypeSchema,
    exceptionReason: z.string().trim().max(3000).optional(),
    evidence: phasePromotionEvidenceSchema,
    eligibilityChecklist: z.array(eligibilityChecklistItemSchema).min(1).max(10),
    leadRecommendation: leadRecommendationSchema,
  })
  .superRefine((value, context) => {
    if (value.caseType === "exception_case" && !value.exceptionReason?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["exceptionReason"],
        message: "Exception reason is required for exception cases.",
      });
    }
  });

export const listPhasePromotionReviewsSchema = z.object({
  query: z.object({
    programId: uuidSchema.optional(),
    batchId: uuidSchema.optional(),
    candidateId: uuidSchema.optional(),
    status: workflowStatusSchema.optional(),
    caseType: phasePromotionCaseTypeSchema.optional(),
    includeArchived: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
  }),
});

export const getPhasePromotionReviewSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

export const createPhasePromotionReviewSchema = z.object({
  body: phasePromotionBaseBodySchema.extend({
    candidateId: uuidSchema,
  }),
});

export const updatePhasePromotionReviewSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: phasePromotionBaseBodySchema,
});

export const submitPhasePromotionReviewSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

export const reviewPhasePromotionByProgramAdminSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    decision: phasePromotionProgramAdminDecisionSchema,
    note: z.string().trim().min(1).max(4000),
  }),
});

export const decidePhasePromotionBySuperAdminSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    decision: phasePromotionSuperAdminDecisionSchema,
    note: z.string().trim().min(1).max(4000),
  }),
});

export const acknowledgePhasePromotionReviewSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

export type ListPhasePromotionReviewsInput = z.infer<
  typeof listPhasePromotionReviewsSchema
>["query"];
export type CreatePhasePromotionReviewInput = z.infer<
  typeof createPhasePromotionReviewSchema
>["body"];
export type UpdatePhasePromotionReviewInput = z.infer<
  typeof updatePhasePromotionReviewSchema
>["body"];
export type ReviewPhasePromotionByProgramAdminInput = z.infer<
  typeof reviewPhasePromotionByProgramAdminSchema
>["body"];
export type DecidePhasePromotionBySuperAdminInput = z.infer<
  typeof decidePhasePromotionBySuperAdminSchema
>["body"];
