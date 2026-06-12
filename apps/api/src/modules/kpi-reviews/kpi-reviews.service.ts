import type { Role } from "@lms/shared";

import { EvidenceService } from "../evidence/evidence.service.js";
import { notifyKpiReviewCompleted } from "../../integrations/notifications/workflow-notifications.js";
import { HttpError } from "../../errors/http-error.js";
import type {
  CreateKpiReviewInput,
  KpiAttendanceSummaryInput,
  KpiFeeRecommendationInput,
  KpiImprovementPlanInput,
  KpiScoreEntryInput,
  ListKpiReviewsInput,
  UpdateKpiReviewInput,
} from "./kpi-reviews.schema.js";
import {
  KpiReviewsRepository,
  type KpiAttendanceSummaryRecord,
  type KpiFeeRecommendationRecord,
  type KpiImprovementPlanRecord,
  type KpiPromotionSignalRecord,
  type KpiReviewRecord,
  type KpiReviewSummaryRecord,
} from "./kpi-reviews.repository.js";

type ActorContext = {
  actorId: string;
  role: Role;
  ipAddress?: string;
  userAgent?: string;
};

const toKpiReviewBaseResponse = (kpiReview: KpiReviewRecord) => ({
  id: kpiReview.id,
  candidateId: kpiReview.candidateId,
  userId: kpiReview.userId,
  fullName: kpiReview.fullName,
  email: kpiReview.email,
  candidateCode: kpiReview.candidateCode,
  programId: kpiReview.programId,
  programName: kpiReview.programName,
  batchId: kpiReview.batchId,
  batchName: kpiReview.batchName,
  reviewerId: kpiReview.reviewerId,
  reviewerName: kpiReview.reviewerName,
  reviewPeriod: kpiReview.reviewPeriod,
  reviewDate: kpiReview.reviewDate,
  currentPhase: kpiReview.currentPhase,
  currentDesignation: kpiReview.currentDesignation,
  programStartDate: kpiReview.programStartDate,
  monthsInCurrentPhase: kpiReview.monthsInCurrentPhase,
  attendanceSummary: kpiReview.attendanceSummary,
  scores: kpiReview.scores,
  overallScore: kpiReview.overallScore,
  summary: kpiReview.summary,
  improvementPlan: kpiReview.improvementPlan,
  promotionSignal: kpiReview.promotionSignal,
  feeRecommendation: kpiReview.feeRecommendation,
  feedback: kpiReview.feedback,
  status: kpiReview.status,
  completedAt: kpiReview.completedAt?.toISOString() ?? null,
  reviewedAt: kpiReview.reviewedAt?.toISOString() ?? null,
  reviewedBy: kpiReview.reviewedBy,
  reviewNote: kpiReview.reviewNote,
  isActive: kpiReview.isActive,
  createdAt: kpiReview.createdAt.toISOString(),
  updatedAt: kpiReview.updatedAt.toISOString(),
  deletedAt: kpiReview.deletedAt?.toISOString() ?? null,
});

const buildOverallRating = (
  overallScore: number,
): KpiReviewSummaryRecord["overallRating"] => {
  if (overallScore >= 85) {
    return "excellent";
  }

  if (overallScore >= 70) {
    return "good";
  }

  if (overallScore >= 60) {
    return "satisfactory";
  }

  return "below_standard";
};

const prepareScores = (scores: KpiScoreEntryInput[]) => {
  const preparedScores = scores.map((entry) => ({
    ...entry,
    notes: entry.notes || undefined,
  }));

  const invalidScore = preparedScores.find(
    (entry) => entry.score < 0 || entry.score > entry.maxScore,
  );

  if (invalidScore) {
    throw new HttpError(
      400,
      "kpi_score_out_of_range",
      `Score for "${invalidScore.criterion}" must be between 0 and ${invalidScore.maxScore}.`,
    );
  }

  const totalScore = preparedScores.reduce((total, entry) => total + entry.score, 0);
  const totalMaxScore = preparedScores.reduce((total, entry) => total + entry.maxScore, 0);
  const overallScore =
    totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

  return { preparedScores, overallScore };
};

const prepareAttendanceSummary = (
  attendanceSummary: KpiAttendanceSummaryInput,
): KpiAttendanceSummaryRecord => ({
  ...attendanceSummary,
  varianceHours: Number(
    (attendanceSummary.actualHoursLogged - attendanceSummary.monthlyTargetHours).toFixed(2),
  ),
});

const prepareSummary = (
  input: CreateKpiReviewInput["summary"] | UpdateKpiReviewInput["summary"],
  overallScore: number,
): KpiReviewSummaryRecord => ({
  overallRating: buildOverallRating(overallScore),
  topStrengths: input.topStrengths,
  improvementAreas: input.improvementAreas,
  notableAchievements: input.notableAchievements || null,
  qualityIssues: input.qualityIssues || null,
  feedbackResponse: input.feedbackResponse || null,
  conductConcerns: input.conductConcerns || null,
});

const prepareImprovementPlan = (
  input: KpiImprovementPlanInput,
): KpiImprovementPlanRecord => {
  const directives = input.directives.map((directive) => ({
    ...directive,
  }));

  return {
    improvementRequired: directives.length > 0,
    directives,
    pipConsideration: input.pipConsideration,
    nextReviewDate: input.nextReviewDate ?? null,
  };
};

const preparePromotionSignal = (
  input: CreateKpiReviewInput["promotionSignal"] | UpdateKpiReviewInput["promotionSignal"],
): KpiPromotionSignalRecord => ({
  promotionWatch: input.promotionWatch,
  readyForPromotion: input.readyForPromotion,
});

const prepareFeeRecommendation = (
  input?: KpiFeeRecommendationInput,
): KpiFeeRecommendationRecord | undefined => {
  if (!input) {
    return undefined;
  }

  return {
    decision: input.decision,
    incrementAmount: input.incrementAmount ?? null,
    justification: input.justification || null,
  };
};

const prepareReviewPayload = (
  input: CreateKpiReviewInput | UpdateKpiReviewInput,
) => {
  const { preparedScores, overallScore } = prepareScores(input.scores);
  const attendanceSummary = prepareAttendanceSummary(input.attendanceSummary);
  const summary = prepareSummary(input.summary, overallScore);
  const improvementPlan = prepareImprovementPlan(input.improvementPlan);
  const promotionSignal = preparePromotionSignal(input.promotionSignal);
  const feeRecommendation = prepareFeeRecommendation(input.feeRecommendation);

  return {
    reviewDate: input.reviewDate,
    currentPhase: input.currentPhase,
    currentDesignation: input.currentDesignation,
    programStartDate: input.programStartDate,
    monthsInCurrentPhase: input.monthsInCurrentPhase,
    attendanceSummary,
    preparedScores,
    overallScore,
    summary,
    improvementPlan,
    promotionSignal,
    feeRecommendation,
    feedback: input.feedback,
  };
};

const validateReviewCompletion = (review: KpiReviewRecord) => {
  const lowScoreEntries = review.scores.filter((entry) => entry.score <= 6);
  const coveredKeys = new Set(
    review.improvementPlan.directives.map((directive) => directive.criterionKey),
  );
  const missingDirective = lowScoreEntries.find((entry) => !coveredKeys.has(entry.key));

  if (missingDirective) {
    throw new HttpError(
      400,
      "kpi_improvement_directive_required",
      `Add an improvement directive for "${missingDirective.criterion}" before completing the review.`,
    );
  }
};

export class KpiReviewsService {
  constructor(
    private readonly repository = new KpiReviewsRepository(),
    private readonly evidenceService = new EvidenceService(),
  ) {}

  private async toKpiReviewResponse(kpiReview: KpiReviewRecord) {
    const linkedEvidence = await this.evidenceService.getMonthlyLinkedEvidence({
      candidateId: kpiReview.candidateId,
      reviewPeriod: kpiReview.reviewPeriod,
    });

    return {
      ...toKpiReviewBaseResponse(kpiReview),
      linkedEvidence,
    };
  }

  async listKpiReviews(input: ListKpiReviewsInput, context: ActorContext) {
    const kpiReviews = await this.repository.list({
      ...input,
      actorId: context.actorId,
      role: context.role,
    });

    return Promise.all(kpiReviews.map((review) => this.toKpiReviewResponse(review)));
  }

  async getKpiReview(id: string, context: ActorContext) {
    const canAccess = await this.repository.canAccessKpiReview({
      kpiReviewId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(404, "kpi_review_not_found", "KPI review not found.");
    }

    const kpiReview = await this.repository.findById(id);

    if (!kpiReview) {
      throw new HttpError(404, "kpi_review_not_found", "KPI review not found.");
    }

    return this.toKpiReviewResponse(kpiReview);
  }

  async createKpiReview(input: CreateKpiReviewInput, context: ActorContext) {
    if (!["Super Admin", "Program Admin", "Program Lead"].includes(context.role)) {
      throw new HttpError(
        403,
        "kpi_review_reviewer_required",
        "Only admins and leads can create KPI reviews.",
      );
    }

    const canAccessCandidate = await this.repository.canAccessCandidate({
      candidateId: input.candidateId,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccessCandidate) {
      throw new HttpError(404, "candidate_not_found", "Candidate not found in your scope.");
    }

    const existingReview = await this.repository.findByCandidateAndPeriod(
      input.candidateId,
      input.reviewPeriod,
    );

    if (existingReview) {
      throw new HttpError(
        409,
        "kpi_review_exists",
        "A KPI review already exists for this candidate and period.",
      );
    }

    const payload = prepareReviewPayload(input);
    const kpiReview = await this.repository.create({
      candidateId: input.candidateId,
      reviewerId: context.actorId,
      reviewPeriod: input.reviewPeriod,
      reviewDate: payload.reviewDate,
      currentPhase: payload.currentPhase,
      currentDesignation: payload.currentDesignation,
      programStartDate: payload.programStartDate,
      monthsInCurrentPhase: payload.monthsInCurrentPhase,
      attendanceSummary: payload.attendanceSummary,
      scores: payload.preparedScores,
      overallScore: payload.overallScore,
      summary: payload.summary,
      improvementPlan: payload.improvementPlan,
      promotionSignal: payload.promotionSignal,
      feeRecommendation: payload.feeRecommendation,
      feedback: payload.feedback,
    });

    if (!kpiReview) {
      throw new HttpError(500, "kpi_review_create_failed", "Failed to create KPI review.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "kpi.review.created",
      entityType: "kpi_review",
      entityId: kpiReview.id,
      newValue: await this.toKpiReviewResponse(kpiReview),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return this.toKpiReviewResponse(kpiReview);
  }

  async updateKpiReview(id: string, input: UpdateKpiReviewInput, context: ActorContext) {
    if (!["Super Admin", "Program Admin", "Program Lead"].includes(context.role)) {
      throw new HttpError(
        403,
        "kpi_review_reviewer_required",
        "Only admins and leads can update KPI reviews.",
      );
    }

    const canAccess = await this.repository.canAccessKpiReview({
      kpiReviewId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(404, "kpi_review_not_found", "KPI review not found.");
    }

    const existingReview = await this.repository.findById(id);

    if (!existingReview || existingReview.status !== "draft") {
      throw new HttpError(
        409,
        "kpi_review_update_not_allowed",
        "Only draft KPI reviews can be updated.",
      );
    }

    const payload = prepareReviewPayload(input);
    const updatedReview = await this.repository.update(id, {
      reviewDate: payload.reviewDate,
      currentPhase: payload.currentPhase,
      currentDesignation: payload.currentDesignation,
      programStartDate: payload.programStartDate,
      monthsInCurrentPhase: payload.monthsInCurrentPhase,
      attendanceSummary: payload.attendanceSummary,
      scores: payload.preparedScores,
      overallScore: payload.overallScore,
      summary: payload.summary,
      improvementPlan: payload.improvementPlan,
      promotionSignal: payload.promotionSignal,
      feeRecommendation: payload.feeRecommendation,
      feedback: payload.feedback,
      actorId: context.actorId,
    });

    if (!updatedReview) {
      throw new HttpError(404, "kpi_review_not_found", "KPI review not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "kpi.review.updated",
      entityType: "kpi_review",
      entityId: id,
      oldValue: await this.toKpiReviewResponse(existingReview),
      newValue: await this.toKpiReviewResponse(updatedReview),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return this.toKpiReviewResponse(updatedReview);
  }

  async completeKpiReview(id: string, context: ActorContext) {
    if (!["Super Admin", "Program Admin", "Program Lead"].includes(context.role)) {
      throw new HttpError(
        403,
        "kpi_review_reviewer_required",
        "Only admins and leads can complete KPI reviews.",
      );
    }

    const canAccess = await this.repository.canAccessKpiReview({
      kpiReviewId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(404, "kpi_review_not_found", "KPI review not found.");
    }

    const existingReview = await this.repository.findById(id);

    if (!existingReview || existingReview.status !== "draft") {
      throw new HttpError(
        409,
        "kpi_review_complete_not_allowed",
        "Only draft KPI reviews can be completed.",
      );
    }

    validateReviewCompletion(existingReview);

    const completedReview = await this.repository.complete(id, context.actorId);

    if (!completedReview) {
      throw new HttpError(404, "kpi_review_not_found", "KPI review not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "kpi.review.completed",
      entityType: "kpi_review",
      entityId: id,
      oldValue: await this.toKpiReviewResponse(existingReview),
      newValue: await this.toKpiReviewResponse(completedReview),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.evidenceService.syncMonthlyEvidenceLinks({
      kpiReviewId: id,
      candidateId: completedReview.candidateId,
      reviewPeriod: completedReview.reviewPeriod,
      actorId: context.actorId,
    });
    const completedResponse = await this.toKpiReviewResponse(completedReview);
    await this.repository.emitDomainEvent({
      eventName: "kpi.review.completed",
      entityType: "kpi_review",
      entityId: id,
      actorType: "user",
      actorId: context.actorId,
      payload: completedResponse,
    });
    await notifyKpiReviewCompleted({
      candidateUserId: completedReview.userId,
      reviewPeriod: completedReview.reviewPeriod,
      overallScore: completedReview.overallScore,
    });

    return completedResponse;
  }
}
