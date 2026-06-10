import type { Role } from "@lms/shared";

import { notifyKpiReviewCompleted } from "../../integrations/notifications/workflow-notifications.js";
import { HttpError } from "../../errors/http-error.js";
import type {
  CreateKpiReviewInput,
  KpiScoreEntryInput,
  ListKpiReviewsInput,
  UpdateKpiReviewInput,
} from "./kpi-reviews.schema.js";
import { KpiReviewsRepository, type KpiReviewRecord } from "./kpi-reviews.repository.js";

type ActorContext = {
  actorId: string;
  role: Role;
  ipAddress?: string;
  userAgent?: string;
};

const toKpiReviewResponse = (kpiReview: KpiReviewRecord) => ({
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
  scores: kpiReview.scores,
  overallScore: kpiReview.overallScore,
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

export class KpiReviewsService {
  constructor(private readonly repository = new KpiReviewsRepository()) {}

  async listKpiReviews(input: ListKpiReviewsInput, context: ActorContext) {
    const kpiReviews = await this.repository.list({
      ...input,
      actorId: context.actorId,
      role: context.role,
    });

    return kpiReviews.map(toKpiReviewResponse);
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

    return toKpiReviewResponse(kpiReview);
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

    const { preparedScores, overallScore } = prepareScores(input.scores);
    const kpiReview = await this.repository.create({
      candidateId: input.candidateId,
      reviewerId: context.actorId,
      reviewPeriod: input.reviewPeriod,
      scores: preparedScores,
      overallScore,
      feedback: input.feedback,
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
      newValue: toKpiReviewResponse(kpiReview),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return toKpiReviewResponse(kpiReview);
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

    const { preparedScores, overallScore } = prepareScores(input.scores);
    const updatedReview = await this.repository.update(id, {
      scores: preparedScores,
      overallScore,
      feedback: input.feedback,
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
      oldValue: toKpiReviewResponse(existingReview),
      newValue: toKpiReviewResponse(updatedReview),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return toKpiReviewResponse(updatedReview);
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
      oldValue: toKpiReviewResponse(existingReview),
      newValue: toKpiReviewResponse(completedReview),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "kpi.review.completed",
      entityType: "kpi_review",
      entityId: id,
      actorType: "user",
      actorId: context.actorId,
      payload: toKpiReviewResponse(completedReview),
    });
    await notifyKpiReviewCompleted({
      candidateUserId: completedReview.userId,
      reviewPeriod: completedReview.reviewPeriod,
      overallScore: completedReview.overallScore,
    });

    return toKpiReviewResponse(completedReview);
  }
}
