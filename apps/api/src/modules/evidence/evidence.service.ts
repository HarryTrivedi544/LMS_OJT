import type {
  LinkedEvidenceBundleRecord,
  QuarterlyWorkflowSummariesRecord,
} from "./evidence.types.js";
import { EvidenceRepository, getMonthDateRange } from "./evidence.repository.js";

export const getPromotionEvidencePeriod = (
  reviewPeriods: string[],
  fallbackEndDate: string,
) => {
  if (reviewPeriods.length === 0) {
    const end = new Date(`${fallbackEndDate}T00:00:00.000Z`);
    const start = new Date(end);
    start.setUTCMonth(start.getUTCMonth() - 3);

    return {
      periodStart: start.toISOString().slice(0, 10),
      periodEnd: fallbackEndDate,
    };
  }

  const sortedPeriods = [...reviewPeriods].sort();
  const oldestPeriod = sortedPeriods[0]!;
  const newestPeriod = sortedPeriods[sortedPeriods.length - 1]!;

  return {
    periodStart: getMonthDateRange(oldestPeriod).periodStart,
    periodEnd: getMonthDateRange(newestPeriod).periodEnd,
  };
};

export class EvidenceService {
  constructor(private readonly repository = new EvidenceRepository()) {}

  async getMonthlyLinkedEvidence(input: {
    candidateId: string;
    reviewPeriod: string;
  }): Promise<LinkedEvidenceBundleRecord> {
    return this.repository.buildMonthlyLinkedEvidence(input);
  }

  async getQuarterlyLinkedEvidence(input: {
    candidateId: string;
    periodStart: string;
    periodEnd: string;
    kpiReviewPeriods: string[];
  }): Promise<LinkedEvidenceBundleRecord> {
    return this.repository.buildLinkedEvidenceForPeriod({
      candidateId: input.candidateId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      includeKpiReviews: true,
      kpiReviewPeriods: input.kpiReviewPeriods,
      includeQuarterlySummaries: false,
    });
  }

  async getPromotionLinkedEvidence(input: {
    candidateId: string;
    periodStart: string;
    periodEnd: string;
    kpiReviewPeriods: string[];
    supportingFileIds: string[];
  }): Promise<LinkedEvidenceBundleRecord> {
    return this.repository.buildLinkedEvidenceForPeriod({
      candidateId: input.candidateId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      includeKpiReviews: true,
      kpiReviewPeriods: input.kpiReviewPeriods,
      includeQuarterlySummaries: true,
      fileIds: input.supportingFileIds,
    });
  }

  buildWorkflowSummaries(input: {
    timesheetCount: number;
    approvedTimesheetCount: number;
    dailyLogCount: number;
    approvedDailyLogCount: number;
    taskAssignedCount: number;
    taskApprovedCount: number;
    taskRevisionCount: number;
    callCount: number;
    cancelledCallCount: number;
  }): QuarterlyWorkflowSummariesRecord {
    return {
      timesheetSubmissionSummary:
        input.timesheetCount > 0
          ? `${input.approvedTimesheetCount}/${input.timesheetCount} timesheets approved in quarter.`
          : "No timesheets submitted in quarter.",
      dailyLogConsistencySummary:
        input.dailyLogCount > 0
          ? `${input.approvedDailyLogCount}/${input.dailyLogCount} daily logs approved in quarter.`
          : "No daily logs submitted in quarter.",
      taskCompletionSummary:
        input.taskAssignedCount > 0
          ? `${input.taskApprovedCount} approved, ${input.taskRevisionCount} sent for revision out of ${input.taskAssignedCount} tasks.`
          : "No task brief activity in quarter.",
      callEngagementSummary:
        input.callCount > 0
          ? `${input.callCount} calls scheduled (${input.cancelledCallCount} cancelled).`
          : "No mentoring or review calls in quarter.",
    };
  }

  async syncMonthlyEvidenceLinks(input: {
    kpiReviewId: string;
    candidateId: string;
    reviewPeriod: string;
    actorId: string;
  }) {
    const bundle = await this.repository.buildMonthlyLinkedEvidence({
      candidateId: input.candidateId,
      reviewPeriod: input.reviewPeriod,
    });

    await this.repository.syncEvidenceLinks({
      parentEntityType: "kpi_review",
      parentEntityId: input.kpiReviewId,
      candidateId: input.candidateId,
      bundle,
      actorId: input.actorId,
    });
  }

  async syncQuarterlyEvidenceLinks(input: {
    quarterlySummaryId: string;
    candidateId: string;
    periodStart: string;
    periodEnd: string;
    kpiReviewPeriods: string[];
    actorId: string;
  }) {
    const bundle = await this.getQuarterlyLinkedEvidence({
      candidateId: input.candidateId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      kpiReviewPeriods: input.kpiReviewPeriods,
    });

    await this.repository.syncEvidenceLinks({
      parentEntityType: "quarterly_kpi_summary",
      parentEntityId: input.quarterlySummaryId,
      candidateId: input.candidateId,
      bundle,
      actorId: input.actorId,
    });
  }

  async syncPromotionEvidenceLinks(input: {
    promotionReviewId: string;
    candidateId: string;
    periodStart: string;
    periodEnd: string;
    kpiReviewPeriods: string[];
    supportingFileIds: string[];
    actorId: string;
  }) {
    const bundle = await this.getPromotionLinkedEvidence(input);

    await this.repository.syncEvidenceLinks({
      parentEntityType: "phase_promotion_review",
      parentEntityId: input.promotionReviewId,
      candidateId: input.candidateId,
      bundle,
      actorId: input.actorId,
    });
  }
}
