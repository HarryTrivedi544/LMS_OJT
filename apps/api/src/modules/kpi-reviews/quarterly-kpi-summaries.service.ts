import type { Role } from "@lms/shared";

import { EvidenceService } from "../evidence/evidence.service.js";
import { HttpError } from "../../errors/http-error.js";
import type {
  CreateQuarterlyKpiSummaryInput,
  ListQuarterlyKpiSummariesInput,
  UpdateQuarterlyKpiSummaryInput,
} from "./quarterly-kpi-summaries.schema.js";
import {
  QuarterlyKpiSummariesRepository,
  type QuarterlyKpiActionPlanRecord,
  type QuarterlyKpiAssessmentRecord,
  type QuarterlyKpiSummaryRecord,
} from "./quarterly-kpi-summaries.repository.js";

type ActorContext = {
  actorId: string;
  role: Role;
  ipAddress?: string;
  userAgent?: string;
};

const toQuarterlySummaryBaseResponse = (summary: QuarterlyKpiSummaryRecord) => ({
  id: summary.id,
  candidateId: summary.candidateId,
  userId: summary.userId,
  fullName: summary.fullName,
  email: summary.email,
  candidateCode: summary.candidateCode,
  programId: summary.programId,
  programName: summary.programName,
  batchId: summary.batchId,
  batchName: summary.batchName,
  reviewerId: summary.reviewerId,
  reviewerName: summary.reviewerName,
  reviewYear: summary.reviewYear,
  reviewQuarter: summary.reviewQuarter,
  reviewDate: summary.reviewDate,
  reviewPeriodStart: summary.reviewPeriodStart,
  reviewPeriodEnd: summary.reviewPeriodEnd,
  currentPhase: summary.currentPhase,
  currentDesignation: summary.currentDesignation,
  rollup: summary.rollup,
  assessment: summary.assessment,
  actionPlan: summary.actionPlan,
  outcome: summary.outcome,
  feedback: summary.feedback,
  status: summary.status,
  completedAt: summary.completedAt?.toISOString() ?? null,
  reviewedAt: summary.reviewedAt?.toISOString() ?? null,
  reviewedBy: summary.reviewedBy,
  reviewNote: summary.reviewNote,
  isActive: summary.isActive,
  createdAt: summary.createdAt.toISOString(),
  updatedAt: summary.updatedAt.toISOString(),
  deletedAt: summary.deletedAt?.toISOString() ?? null,
});

const listQuarterMonths = (reviewYear: number, reviewQuarter: number) => {
  const startMonth = (reviewQuarter - 1) * 3 + 1;

  return Array.from({ length: 3 }, (_, index) => {
    const month = String(startMonth + index).padStart(2, "0");
    return `${reviewYear}-${month}`;
  });
};

const getQuarterDateRange = (reviewYear: number, reviewQuarter: number) => {
  const startMonth = (reviewQuarter - 1) * 3;
  const startDate = new Date(Date.UTC(reviewYear, startMonth, 1));
  const endDate = new Date(Date.UTC(reviewYear, startMonth + 3, 0));

  return {
    reviewPeriodStart: startDate.toISOString().slice(0, 10),
    reviewPeriodEnd: endDate.toISOString().slice(0, 10),
  };
};

const prepareAssessment = (
  input: CreateQuarterlyKpiSummaryInput["assessment"] | UpdateQuarterlyKpiSummaryInput["assessment"],
): QuarterlyKpiAssessmentRecord => ({
  technicalGrowthSummary: input.technicalGrowthSummary || null,
  deliveryConsistencySummary: input.deliveryConsistencySummary || null,
  communicationCollaborationSummary: input.communicationCollaborationSummary || null,
  ownershipIndependenceSummary: input.ownershipIndependenceSummary || null,
  reviewResponsivenessSummary: input.reviewResponsivenessSummary || null,
  riskFlags: input.riskFlags || null,
  strengths: input.strengths,
  improvementPriorities: input.improvementPriorities,
  recommendedFocus: input.recommendedFocus || null,
});

const prepareActionPlan = (
  input: CreateQuarterlyKpiSummaryInput["actionPlan"] | UpdateQuarterlyKpiSummaryInput["actionPlan"],
): QuarterlyKpiActionPlanRecord => ({
  nextQuarterGoals: input.nextQuarterGoals || null,
  expectedSkillImprovements: input.expectedSkillImprovements || null,
  expectedDeliveryImprovements: input.expectedDeliveryImprovements || null,
  supportRequired: input.supportRequired || null,
  followUpDate: input.followUpDate || null,
});

export class QuarterlyKpiSummariesService {
  constructor(
    private readonly repository = new QuarterlyKpiSummariesRepository(),
    private readonly evidenceService = new EvidenceService(),
  ) {}

  private async toQuarterlySummaryResponse(summary: QuarterlyKpiSummaryRecord) {
    const kpiReviewPeriods =
      summary.rollup.linkedMonthlyKpiReviews.length > 0
        ? summary.rollup.linkedMonthlyKpiReviews.map((review) => review.reviewPeriod)
        : listQuarterMonths(summary.reviewYear, summary.reviewQuarter);

    const linkedEvidence = await this.evidenceService.getQuarterlyLinkedEvidence({
      candidateId: summary.candidateId,
      periodStart: summary.reviewPeriodStart,
      periodEnd: summary.reviewPeriodEnd,
      kpiReviewPeriods,
    });

    return {
      ...toQuarterlySummaryBaseResponse(summary),
      linkedEvidence,
    };
  }

  async listQuarterlyKpiSummaries(input: ListQuarterlyKpiSummariesInput, context: ActorContext) {
    const summaries = await this.repository.list({
      ...input,
      actorId: context.actorId,
      role: context.role,
    });

    return Promise.all(summaries.map((summary) => this.toQuarterlySummaryResponse(summary)));
  }

  async getQuarterlyKpiSummary(id: string, context: ActorContext) {
    const canAccess = await this.repository.canAccessQuarterlySummary({
      quarterlySummaryId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(404, "quarterly_kpi_summary_not_found", "Quarterly KPI summary not found.");
    }

    const summary = await this.repository.findById(id);

    if (!summary) {
      throw new HttpError(404, "quarterly_kpi_summary_not_found", "Quarterly KPI summary not found.");
    }

    return this.toQuarterlySummaryResponse(summary);
  }

  async createQuarterlyKpiSummary(
    input: CreateQuarterlyKpiSummaryInput,
    context: ActorContext,
  ) {
    if (!["Super Admin", "Program Admin", "Program Lead"].includes(context.role)) {
      throw new HttpError(
        403,
        "quarterly_kpi_reviewer_required",
        "Only admins and leads can create quarterly KPI summaries.",
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

    const existingSummary = await this.repository.findByCandidateAndQuarter(
      input.candidateId,
      input.reviewYear,
      input.reviewQuarter,
    );

    if (existingSummary) {
      throw new HttpError(
        409,
        "quarterly_kpi_summary_exists",
        "A quarterly KPI summary already exists for this candidate and quarter.",
      );
    }

    const { reviewPeriodStart, reviewPeriodEnd } = getQuarterDateRange(
      input.reviewYear,
      input.reviewQuarter,
    );
    const rollup = await this.repository.buildRollup({
      candidateId: input.candidateId,
      reviewYear: input.reviewYear,
      reviewQuarter: input.reviewQuarter,
      reviewPeriodStart,
      reviewPeriodEnd,
    });

    const summary = await this.repository.create({
      candidateId: input.candidateId,
      reviewerId: context.actorId,
      reviewYear: input.reviewYear,
      reviewQuarter: input.reviewQuarter,
      reviewDate: input.reviewDate,
      reviewPeriodStart,
      reviewPeriodEnd,
      currentPhase: input.currentPhase,
      currentDesignation: input.currentDesignation,
      rollup,
      assessment: prepareAssessment(input.assessment),
      actionPlan: prepareActionPlan(input.actionPlan),
      outcome: input.outcome,
      feedback: input.feedback,
    });

    if (!summary) {
      throw new HttpError(
        500,
        "quarterly_kpi_summary_create_failed",
        "Failed to create quarterly KPI summary.",
      );
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "quarterly.kpi.created",
      entityType: "quarterly_kpi_summary",
      entityId: summary.id,
      newValue: await this.toQuarterlySummaryResponse(summary),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return this.toQuarterlySummaryResponse(summary);
  }

  async updateQuarterlyKpiSummary(
    id: string,
    input: UpdateQuarterlyKpiSummaryInput,
    context: ActorContext,
  ) {
    if (!["Super Admin", "Program Admin", "Program Lead"].includes(context.role)) {
      throw new HttpError(
        403,
        "quarterly_kpi_reviewer_required",
        "Only admins and leads can update quarterly KPI summaries.",
      );
    }

    const canAccess = await this.repository.canAccessQuarterlySummary({
      quarterlySummaryId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(404, "quarterly_kpi_summary_not_found", "Quarterly KPI summary not found.");
    }

    const existingSummary = await this.repository.findById(id);

    if (!existingSummary || existingSummary.status !== "draft") {
      throw new HttpError(
        409,
        "quarterly_kpi_summary_update_not_allowed",
        "Only draft quarterly KPI summaries can be updated.",
      );
    }

    const rollup = await this.repository.buildRollup({
      candidateId: existingSummary.candidateId,
      reviewYear: existingSummary.reviewYear,
      reviewQuarter: existingSummary.reviewQuarter,
      reviewPeriodStart: existingSummary.reviewPeriodStart,
      reviewPeriodEnd: existingSummary.reviewPeriodEnd,
    });

    const updatedSummary = await this.repository.update(id, {
      reviewDate: input.reviewDate,
      currentPhase: input.currentPhase,
      currentDesignation: input.currentDesignation,
      rollup,
      assessment: prepareAssessment(input.assessment),
      actionPlan: prepareActionPlan(input.actionPlan),
      outcome: input.outcome,
      feedback: input.feedback,
      actorId: context.actorId,
    });

    if (!updatedSummary) {
      throw new HttpError(404, "quarterly_kpi_summary_not_found", "Quarterly KPI summary not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "quarterly.kpi.updated",
      entityType: "quarterly_kpi_summary",
      entityId: id,
      oldValue: await this.toQuarterlySummaryResponse(existingSummary),
      newValue: await this.toQuarterlySummaryResponse(updatedSummary),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return this.toQuarterlySummaryResponse(updatedSummary);
  }

  async completeQuarterlyKpiSummary(id: string, context: ActorContext) {
    if (!["Super Admin", "Program Admin", "Program Lead"].includes(context.role)) {
      throw new HttpError(
        403,
        "quarterly_kpi_reviewer_required",
        "Only admins and leads can complete quarterly KPI summaries.",
      );
    }

    const canAccess = await this.repository.canAccessQuarterlySummary({
      quarterlySummaryId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(404, "quarterly_kpi_summary_not_found", "Quarterly KPI summary not found.");
    }

    const existingSummary = await this.repository.findById(id);

    if (!existingSummary || existingSummary.status !== "draft") {
      throw new HttpError(
        409,
        "quarterly_kpi_summary_complete_not_allowed",
        "Only draft quarterly KPI summaries can be completed.",
      );
    }

    const completedSummary = await this.repository.complete(id, context.actorId);

    if (!completedSummary) {
      throw new HttpError(404, "quarterly_kpi_summary_not_found", "Quarterly KPI summary not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "quarterly.kpi.completed",
      entityType: "quarterly_kpi_summary",
      entityId: id,
      oldValue: await this.toQuarterlySummaryResponse(existingSummary),
      newValue: await this.toQuarterlySummaryResponse(completedSummary),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    const kpiReviewPeriods =
      completedSummary.rollup.linkedMonthlyKpiReviews.length > 0
        ? completedSummary.rollup.linkedMonthlyKpiReviews.map((review) => review.reviewPeriod)
        : listQuarterMonths(completedSummary.reviewYear, completedSummary.reviewQuarter);
    await this.evidenceService.syncQuarterlyEvidenceLinks({
      quarterlySummaryId: id,
      candidateId: completedSummary.candidateId,
      periodStart: completedSummary.reviewPeriodStart,
      periodEnd: completedSummary.reviewPeriodEnd,
      kpiReviewPeriods,
      actorId: context.actorId,
    });
    const completedResponse = await this.toQuarterlySummaryResponse(completedSummary);
    await this.repository.emitDomainEvent({
      eventName: "quarterly.kpi.completed",
      entityType: "quarterly_kpi_summary",
      entityId: id,
      actorType: "user",
      actorId: context.actorId,
      payload: completedResponse,
    });

    return completedResponse;
  }
}
