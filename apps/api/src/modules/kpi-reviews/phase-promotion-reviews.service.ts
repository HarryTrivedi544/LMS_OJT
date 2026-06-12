import type { Role } from "@lms/shared";

import {
  EvidenceService,
  getPromotionEvidencePeriod,
} from "../evidence/evidence.service.js";
import { HttpError } from "../../errors/http-error.js";
import type {
  CreatePhasePromotionReviewInput,
  DecidePhasePromotionBySuperAdminInput,
  ListPhasePromotionReviewsInput,
  ReviewPhasePromotionByProgramAdminInput,
  UpdatePhasePromotionReviewInput,
} from "./phase-promotion-reviews.schema.js";
import {
  PhasePromotionReviewsRepository,
  type PhasePromotionReviewRecord,
} from "./phase-promotion-reviews.repository.js";

type ActorContext = {
  actorId: string;
  role: Role;
  ipAddress?: string;
  userAgent?: string;
};

const toPhasePromotionReviewBaseResponse = (review: PhasePromotionReviewRecord) => ({
  id: review.id,
  candidateId: review.candidateId,
  userId: review.userId,
  fullName: review.fullName,
  email: review.email,
  candidateCode: review.candidateCode,
  programId: review.programId,
  programName: review.programName,
  batchId: review.batchId,
  batchName: review.batchName,
  preparedBy: review.preparedBy,
  preparedByName: review.preparedByName,
  preparedDate: review.preparedDate,
  currentPhase: review.currentPhase,
  currentDesignation: review.currentDesignation,
  proposedNextPhase: review.proposedNextPhase,
  proposedNextDesignation: review.proposedNextDesignation,
  currentMonthlyFee: review.currentMonthlyFee,
  proposedMonthlyFee: review.proposedMonthlyFee,
  currentPhaseStartDate: review.currentPhaseStartDate,
  monthsInCurrentPhase: review.monthsInCurrentPhase,
  promotionEffectiveDate: review.promotionEffectiveDate,
  promotionCycleType: review.promotionCycleType,
  caseType: review.caseType,
  exceptionReason: review.exceptionReason,
  evidence: review.evidence,
  eligibilityChecklist: review.eligibilityChecklist,
  leadRecommendation: review.leadRecommendation,
  programAdminReview: review.programAdminReview,
  superAdminDecision: review.superAdminDecision,
  candidateAcknowledgedAt: review.candidateAcknowledgedAt?.toISOString() ?? null,
  candidateAcknowledgedBy: review.candidateAcknowledgedBy,
  status: review.status,
  submittedAt: review.submittedAt?.toISOString() ?? null,
  programAdminReviewedAt: review.programAdminReviewedAt?.toISOString() ?? null,
  programAdminReviewedBy: review.programAdminReviewedBy,
  superAdminReviewedAt: review.superAdminReviewedAt?.toISOString() ?? null,
  superAdminReviewedBy: review.superAdminReviewedBy,
  reviewNote: review.reviewNote,
  isActive: review.isActive,
  createdAt: review.createdAt.toISOString(),
  updatedAt: review.updatedAt.toISOString(),
  deletedAt: review.deletedAt?.toISOString() ?? null,
});

const validateChecklistForSubmission = (review: PhasePromotionReviewRecord) => {
  if (review.eligibilityChecklist.length === 0) {
    throw new HttpError(
      400,
      "phase_promotion_checklist_required",
      "Eligibility checklist is required before submission.",
    );
  }

  const unmetItems = review.eligibilityChecklist.filter(
    (item) => !item.evidence || item.evidence.trim().length === 0,
  );

  if (unmetItems.length > 0) {
    throw new HttpError(
      400,
      "phase_promotion_checklist_evidence_required",
      "Every eligibility checklist item must include supporting evidence before submission.",
    );
  }
};

export class PhasePromotionReviewsService {
  constructor(
    private readonly repository = new PhasePromotionReviewsRepository(),
    private readonly evidenceService = new EvidenceService(),
  ) {}

  private async toPhasePromotionReviewResponse(review: PhasePromotionReviewRecord) {
    const kpiReviewPeriods = review.evidence.recentMonthlyKpiAverages.map(
      (entry) => entry.reviewPeriod,
    );
    const { periodStart, periodEnd } = getPromotionEvidencePeriod(
      kpiReviewPeriods,
      review.preparedDate,
    );
    const linkedEvidence = await this.evidenceService.getPromotionLinkedEvidence({
      candidateId: review.candidateId,
      periodStart,
      periodEnd,
      kpiReviewPeriods,
      supportingFileIds: review.evidence.supportingFileIds,
    });

    return {
      ...toPhasePromotionReviewBaseResponse(review),
      linkedEvidence,
    };
  }

  async listPhasePromotionReviews(input: ListPhasePromotionReviewsInput, context: ActorContext) {
    const reviews = await this.repository.list({
      ...input,
      actorId: context.actorId,
      role: context.role,
    });

    return Promise.all(reviews.map((review) => this.toPhasePromotionReviewResponse(review)));
  }

  async getPhasePromotionReview(id: string, context: ActorContext) {
    const canAccess = await this.repository.canAccessPhasePromotionReview({
      reviewId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(
        404,
        "phase_promotion_review_not_found",
        "Phase promotion review not found.",
      );
    }

    const review = await this.repository.findById(id);

    if (!review) {
      throw new HttpError(
        404,
        "phase_promotion_review_not_found",
        "Phase promotion review not found.",
      );
    }

    return this.toPhasePromotionReviewResponse(review);
  }

  async createPhasePromotionReview(input: CreatePhasePromotionReviewInput, context: ActorContext) {
    if (!["Super Admin", "Program Admin", "Program Lead"].includes(context.role)) {
      throw new HttpError(
        403,
        "phase_promotion_prepare_required",
        "Only admins and leads can prepare phase promotion reviews.",
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

    const evidence = await this.repository.buildEvidence({
      candidateId: input.candidateId,
      qualityReworkSummary: input.evidence.qualityReworkSummary,
      leadReviewSummary: input.evidence.leadReviewSummary,
      keyProjectsCompleted: input.evidence.keyProjectsCompleted,
      skillsDemonstrated: input.evidence.skillsDemonstrated,
      independentDeliveryEvidence: input.evidence.independentDeliveryEvidence,
      mentoringLeadershipSignals: input.evidence.mentoringLeadershipSignals,
      repositoryLinks: input.evidence.repositoryLinks,
      supportingFileIds: input.evidence.supportingFileIds,
    });

    const review = await this.repository.create({
      candidateId: input.candidateId,
      preparedBy: context.actorId,
      preparedDate: input.preparedDate,
      currentPhase: input.currentPhase,
      currentDesignation: input.currentDesignation,
      proposedNextPhase: input.proposedNextPhase,
      proposedNextDesignation: input.proposedNextDesignation,
      currentMonthlyFee: input.currentMonthlyFee,
      proposedMonthlyFee: input.proposedMonthlyFee,
      currentPhaseStartDate: input.currentPhaseStartDate,
      monthsInCurrentPhase: input.monthsInCurrentPhase,
      promotionEffectiveDate: input.promotionEffectiveDate,
      promotionCycleType: input.promotionCycleType,
      caseType: input.caseType,
      exceptionReason: input.exceptionReason,
      evidence,
      eligibilityChecklist: input.eligibilityChecklist.map((item) => ({
        ...item,
        evidence: item.evidence ?? null,
      })),
      leadRecommendation: {
        recommendation: input.leadRecommendation.recommendation,
        summary: input.leadRecommendation.summary ?? null,
        conditions: input.leadRecommendation.conditions ?? null,
        initialAssignmentNextPhase: input.leadRecommendation.initialAssignmentNextPhase ?? null,
      },
    });

    if (!review) {
      throw new HttpError(
        500,
        "phase_promotion_review_create_failed",
        "Failed to create phase promotion review.",
      );
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "phase.promotion.created",
      entityType: "phase_promotion_review",
      entityId: review.id,
      newValue: await this.toPhasePromotionReviewResponse(review),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return this.toPhasePromotionReviewResponse(review);
  }

  async updatePhasePromotionReview(
    id: string,
    input: UpdatePhasePromotionReviewInput,
    context: ActorContext,
  ) {
    if (!["Super Admin", "Program Admin", "Program Lead"].includes(context.role)) {
      throw new HttpError(
        403,
        "phase_promotion_prepare_required",
        "Only admins and leads can update phase promotion reviews.",
      );
    }

    const canAccess = await this.repository.canAccessPhasePromotionReview({
      reviewId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(
        404,
        "phase_promotion_review_not_found",
        "Phase promotion review not found.",
      );
    }

    const existingReview = await this.repository.findById(id);

    if (!existingReview || !["draft", "revision_required"].includes(existingReview.status)) {
      throw new HttpError(
        409,
        "phase_promotion_review_update_not_allowed",
        "Only draft or revision-required phase promotion reviews can be updated.",
      );
    }

    const evidence = await this.repository.buildEvidence({
      candidateId: existingReview.candidateId,
      qualityReworkSummary: input.evidence.qualityReworkSummary,
      leadReviewSummary: input.evidence.leadReviewSummary,
      keyProjectsCompleted: input.evidence.keyProjectsCompleted,
      skillsDemonstrated: input.evidence.skillsDemonstrated,
      independentDeliveryEvidence: input.evidence.independentDeliveryEvidence,
      mentoringLeadershipSignals: input.evidence.mentoringLeadershipSignals,
      repositoryLinks: input.evidence.repositoryLinks,
      supportingFileIds: input.evidence.supportingFileIds,
    });

    const updatedReview = await this.repository.update(id, {
      preparedDate: input.preparedDate,
      currentPhase: input.currentPhase,
      currentDesignation: input.currentDesignation,
      proposedNextPhase: input.proposedNextPhase,
      proposedNextDesignation: input.proposedNextDesignation,
      currentMonthlyFee: input.currentMonthlyFee,
      proposedMonthlyFee: input.proposedMonthlyFee,
      currentPhaseStartDate: input.currentPhaseStartDate,
      monthsInCurrentPhase: input.monthsInCurrentPhase,
      promotionEffectiveDate: input.promotionEffectiveDate,
      promotionCycleType: input.promotionCycleType,
      caseType: input.caseType,
      exceptionReason: input.exceptionReason,
      evidence,
      eligibilityChecklist: input.eligibilityChecklist.map((item) => ({
        ...item,
        evidence: item.evidence ?? null,
      })),
      leadRecommendation: {
        recommendation: input.leadRecommendation.recommendation,
        summary: input.leadRecommendation.summary ?? null,
        conditions: input.leadRecommendation.conditions ?? null,
        initialAssignmentNextPhase: input.leadRecommendation.initialAssignmentNextPhase ?? null,
      },
      actorId: context.actorId,
    });

    if (!updatedReview) {
      throw new HttpError(
        404,
        "phase_promotion_review_not_found",
        "Phase promotion review not found.",
      );
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "phase.promotion.updated",
      entityType: "phase_promotion_review",
      entityId: id,
      oldValue: await this.toPhasePromotionReviewResponse(existingReview),
      newValue: await this.toPhasePromotionReviewResponse(updatedReview),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return this.toPhasePromotionReviewResponse(updatedReview);
  }

  async submitPhasePromotionReview(id: string, context: ActorContext) {
    if (!["Super Admin", "Program Admin", "Program Lead"].includes(context.role)) {
      throw new HttpError(
        403,
        "phase_promotion_prepare_required",
        "Only admins and leads can submit phase promotion reviews.",
      );
    }

    const canAccess = await this.repository.canAccessPhasePromotionReview({
      reviewId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(
        404,
        "phase_promotion_review_not_found",
        "Phase promotion review not found.",
      );
    }

    const existingReview = await this.repository.findById(id);

    if (!existingReview || !["draft", "revision_required"].includes(existingReview.status)) {
      throw new HttpError(
        409,
        "phase_promotion_review_submit_not_allowed",
        "Only draft or revision-required phase promotion reviews can be submitted.",
      );
    }

    validateChecklistForSubmission(existingReview);

    const submittedReview = await this.repository.submit(id, context.actorId);

    if (!submittedReview) {
      throw new HttpError(
        404,
        "phase_promotion_review_not_found",
        "Phase promotion review not found.",
      );
    }

    const kpiReviewPeriods = submittedReview.evidence.recentMonthlyKpiAverages.map(
      (entry) => entry.reviewPeriod,
    );
    const { periodStart, periodEnd } = getPromotionEvidencePeriod(
      kpiReviewPeriods,
      submittedReview.preparedDate,
    );
    await this.evidenceService.syncPromotionEvidenceLinks({
      promotionReviewId: id,
      candidateId: submittedReview.candidateId,
      periodStart,
      periodEnd,
      kpiReviewPeriods,
      supportingFileIds: submittedReview.evidence.supportingFileIds,
      actorId: context.actorId,
    });
    const submittedResponse = await this.toPhasePromotionReviewResponse(submittedReview);

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "phase.promotion.submitted",
      entityType: "phase_promotion_review",
      entityId: id,
      oldValue: await this.toPhasePromotionReviewResponse(existingReview),
      newValue: submittedResponse,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "phase.promotion.submitted",
      entityType: "phase_promotion_review",
      entityId: id,
      actorType: "user",
      actorId: context.actorId,
      payload: submittedResponse,
    });

    return submittedResponse;
  }

  async reviewByProgramAdmin(
    id: string,
    input: ReviewPhasePromotionByProgramAdminInput,
    context: ActorContext,
  ) {
    if (!["Super Admin", "Program Admin"].includes(context.role)) {
      throw new HttpError(
        403,
        "phase_promotion_program_admin_required",
        "Only Program Admins or Super Admins can review this step.",
      );
    }

    const canAccess = await this.repository.canAccessPhasePromotionReview({
      reviewId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(
        404,
        "phase_promotion_review_not_found",
        "Phase promotion review not found.",
      );
    }

    const existingReview = await this.repository.findById(id);

    if (!existingReview || !["submitted", "under_review"].includes(existingReview.status)) {
      throw new HttpError(
        409,
        "phase_promotion_program_admin_review_not_allowed",
        "Only submitted or under-review phase promotion reviews can be reviewed by Program Admin.",
      );
    }

    const reviewed = await this.repository.reviewByProgramAdmin(id, {
      ...input,
      actorId: context.actorId,
    });

    if (!reviewed) {
      throw new HttpError(
        404,
        "phase_promotion_review_not_found",
        "Phase promotion review not found.",
      );
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "phase.promotion.program_admin_reviewed",
      entityType: "phase_promotion_review",
      entityId: id,
      oldValue: await this.toPhasePromotionReviewResponse(existingReview),
      newValue: await this.toPhasePromotionReviewResponse(reviewed),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    const reviewedResponse = await this.toPhasePromotionReviewResponse(reviewed);
    await this.repository.emitDomainEvent({
      eventName: `phase.promotion.${input.decision}`,
      entityType: "phase_promotion_review",
      entityId: id,
      actorType: "user",
      actorId: context.actorId,
      payload: reviewedResponse,
    });

    return reviewedResponse;
  }

  async decideBySuperAdmin(
    id: string,
    input: DecidePhasePromotionBySuperAdminInput,
    context: ActorContext,
  ) {
    if (context.role !== "Super Admin") {
      throw new HttpError(
        403,
        "phase_promotion_super_admin_required",
        "Only Super Admin can make the final phase promotion decision.",
      );
    }

    const canAccess = await this.repository.canAccessPhasePromotionReview({
      reviewId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(
        404,
        "phase_promotion_review_not_found",
        "Phase promotion review not found.",
      );
    }

    const existingReview = await this.repository.findById(id);

    if (!existingReview || !["submitted", "under_review"].includes(existingReview.status)) {
      throw new HttpError(
        409,
        "phase_promotion_super_admin_decision_not_allowed",
        "Only submitted or under-review phase promotion reviews can receive a final decision.",
      );
    }

    const decided = await this.repository.decideBySuperAdmin(id, {
      ...input,
      actorId: context.actorId,
    });

    if (!decided) {
      throw new HttpError(
        404,
        "phase_promotion_review_not_found",
        "Phase promotion review not found.",
      );
    }

    if (input.decision === "approved") {
      await this.repository.applyApprovedPromotion({
        candidateId: decided.candidateId,
        currentPhase: decided.proposedNextPhase,
        currentDesignation: decided.proposedNextDesignation,
        currentMonthlyFee: decided.proposedMonthlyFee,
        currentPhaseStartDate: decided.promotionEffectiveDate,
        actorId: context.actorId,
      });
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "phase.promotion.super_admin_decided",
      entityType: "phase_promotion_review",
      entityId: id,
      oldValue: await this.toPhasePromotionReviewResponse(existingReview),
      newValue: await this.toPhasePromotionReviewResponse(decided),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    const decidedResponse = await this.toPhasePromotionReviewResponse(decided);
    await this.repository.emitDomainEvent({
      eventName: `phase.promotion.${input.decision}`,
      entityType: "phase_promotion_review",
      entityId: id,
      actorType: "user",
      actorId: context.actorId,
      payload: decidedResponse,
    });

    return decidedResponse;
  }

  async acknowledgePhasePromotionReview(id: string, context: ActorContext) {
    if (context.role !== "Candidate") {
      throw new HttpError(
        403,
        "phase_promotion_candidate_required",
        "Only the candidate can acknowledge the final decision.",
      );
    }

    const canAccess = await this.repository.canAccessPhasePromotionReview({
      reviewId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(
        404,
        "phase_promotion_review_not_found",
        "Phase promotion review not found.",
      );
    }

    const existingReview = await this.repository.findById(id);

    if (!existingReview || !["approved", "rejected"].includes(existingReview.status)) {
      throw new HttpError(
        409,
        "phase_promotion_acknowledge_not_allowed",
        "Only final promotion decisions can be acknowledged.",
      );
    }

    if (existingReview.candidateAcknowledgedAt) {
      return this.toPhasePromotionReviewResponse(existingReview);
    }

    const acknowledged = await this.repository.acknowledge(id, context.actorId);

    if (!acknowledged) {
      throw new HttpError(
        404,
        "phase_promotion_review_not_found",
        "Phase promotion review not found.",
      );
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "phase.promotion.acknowledged",
      entityType: "phase_promotion_review",
      entityId: id,
      oldValue: await this.toPhasePromotionReviewResponse(existingReview),
      newValue: await this.toPhasePromotionReviewResponse(acknowledged),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return this.toPhasePromotionReviewResponse(acknowledged);
  }
}
