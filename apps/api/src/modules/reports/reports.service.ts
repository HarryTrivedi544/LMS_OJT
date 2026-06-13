import { HttpError } from "../../errors/http-error.js";
import type { ListReportsOverviewInput } from "./reports.schema.js";
import {
  ReportsRepository,
  type ReportCallRecord,
  type ReportCandidateLogRecord,
  type ReportCandidateRecord,
  type ReportKpiReviewRecord,
  type ReportPhasePromotionRecord,
  type ReportQuarterlyKpiSummaryRecord,
  type ReportTaskBriefRecord,
  type ReportTimesheetRecord,
} from "./reports.repository.js";
import type { Role } from "@lms/shared";

type ActorContext = {
  actorId: string;
  role: Role;
};

const round = (value: number | null) =>
  value === null ? null : Math.round(value * 100) / 100;

const percentage = (numerator: number, denominator: number) =>
  denominator > 0 ? round((numerator / denominator) * 100) : null;

const getRecord = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const getBoolean = (value: unknown) => value === true;

const getString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const getNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const compareQuarterly = (
  left: Pick<ReportQuarterlyKpiSummaryRecord, "reviewYear" | "reviewQuarter">,
  right: Pick<ReportQuarterlyKpiSummaryRecord, "reviewYear" | "reviewQuarter">,
) => left.reviewYear - right.reviewYear || left.reviewQuarter - right.reviewQuarter;

export class ReportsService {
  constructor(private readonly repository = new ReportsRepository()) {}

  async getOverview(input: ListReportsOverviewInput, context: ActorContext) {
    if (context.role === "Candidate") {
      throw new HttpError(
        403,
        "reports_access_denied",
        "Candidate reports dashboard is not available in this workspace yet.",
      );
    }

    const candidates = await this.repository.listCandidates({
      role: context.role,
      actorId: context.actorId,
      programId: input.programId,
      batchId: input.batchId,
      candidateId: input.candidateId,
    });
    const candidateIds = candidates.map((candidate) => candidate.id);

    const [kpiReviews, quarterlySummaries, phasePromotions, timesheetRows, dailyLogRows, taskRows, callRows] =
      await Promise.all([
        this.repository.listKpiReviews(candidateIds),
        this.repository.listQuarterlySummaries(candidateIds),
        this.repository.listPhasePromotions(candidateIds),
        this.repository.listTimesheets(candidateIds),
        this.repository.listCandidateLogs(candidateIds),
        this.repository.listTaskBriefs(candidateIds),
        this.repository.listCalls(candidateIds),
      ]);

    const kpisByCandidate = this.groupByCandidate(kpiReviews);
    const quarterliesByCandidate = this.groupByCandidate(quarterlySummaries);
    const promotionsByCandidate = this.groupByCandidate(phasePromotions);
    const timesheetsByCandidate = this.groupByCandidate(timesheetRows);
    const logsByCandidate = this.groupByCandidate(dailyLogRows);
    const tasksByCandidate = this.groupByCandidate(taskRows);
    const callsByCandidate = this.groupByCandidate(callRows);

    const candidateProgress = candidates.map((candidate) => {
      const candidateKpis = kpisByCandidate.get(candidate.id) ?? [];
      const candidateQuarterlies = quarterliesByCandidate.get(candidate.id) ?? [];
      const candidatePromotions = promotionsByCandidate.get(candidate.id) ?? [];
      const candidateTimesheets = timesheetsByCandidate.get(candidate.id) ?? [];
      const candidateLogs = logsByCandidate.get(candidate.id) ?? [];
      const candidateTasks = tasksByCandidate.get(candidate.id) ?? [];
      const candidateCalls = callsByCandidate.get(candidate.id) ?? [];

      const completedKpis = candidateKpis.filter((review) => review.completedAt !== null);
      const completedQuarterlies = candidateQuarterlies.filter(
        (summary) => summary.completedAt !== null,
      );
      const latestMonthly = [...candidateKpis].sort((left, right) =>
        right.reviewPeriod.localeCompare(left.reviewPeriod),
      )[0];
      const latestQuarterly = [...candidateQuarterlies].sort((left, right) =>
        compareQuarterly(right, left),
      )[0];
      const latestPromotion = [...candidatePromotions][0] ?? null;

      const monthlyScores = completedKpis
        .map((review) => review.overallScore)
        .filter((score): score is number => score !== null);
      const quarterlyScores = completedQuarterlies
        .map((summary) => getNumber(getRecord(summary.rollup).quarterlyAverageScore))
        .filter((score): score is number => score !== null);

      const totalLoggedHours = round(
        (candidateLogs.reduce((total, log) => total + log.minutesSpent, 0) +
          candidateTimesheets.reduce((total, timesheet) => total + timesheet.totalMinutes, 0)) /
          60,
      ) ?? 0;

      const approvedDailyLogs = candidateLogs.filter((log) => log.status === "approved").length;
      const approvedTimesheets = candidateTimesheets.filter(
        (timesheet) => timesheet.status === "approved",
      ).length;
      const approvedTasks = candidateTasks.filter((task) => task.status === "approved").length;
      const revisionTasks = candidateTasks.filter(
        (task) => task.status === "revision_required",
      ).length;
      const cancelledCalls = candidateCalls.filter((call) => call.status === "cancelled").length;

      return {
        candidateId: candidate.id,
        userId: candidate.userId,
        fullName: candidate.fullName,
        candidateCode: candidate.candidateCode,
        programId: candidate.programId,
        programName: candidate.programName,
        batchId: candidate.batchId,
        batchName: candidate.batchName,
        currentPhase: candidate.currentPhase,
        currentDesignation: candidate.currentDesignation,
        monthlyKpiAverage:
          monthlyScores.length > 0
            ? round(
                monthlyScores.reduce((total, score) => total + score, 0) / monthlyScores.length,
              )
            : null,
        latestMonthlyReviewPeriod: latestMonthly?.reviewPeriod ?? null,
        latestMonthlyScore: latestMonthly?.overallScore ?? null,
        latestQuarterlyLabel: latestQuarterly
          ? `Q${latestQuarterly.reviewQuarter} ${latestQuarterly.reviewYear}`
          : null,
        latestQuarterlyAverage: latestQuarterly
          ? getNumber(getRecord(latestQuarterly.rollup).quarterlyAverageScore)
          : null,
        latestQuarterlyOutcome: latestQuarterly?.outcome ?? null,
        totalLoggedHours,
        dailyLogCount: candidateLogs.length,
        approvedDailyLogCount: approvedDailyLogs,
        timesheetCount: candidateTimesheets.length,
        approvedTimesheetCount: approvedTimesheets,
        taskAssignedCount: candidateTasks.length,
        taskApprovedCount: approvedTasks,
        taskRevisionCount: revisionTasks,
        callCount: candidateCalls.length,
        cancelledCallCount: cancelledCalls,
        activePromotionStatus:
          latestPromotion && !["approved", "rejected"].includes(latestPromotion.status)
            ? latestPromotion.status
            : latestPromotion?.status ?? null,
      };
    });

    const scopePerformance = this.buildScopePerformance({
      candidates,
      candidateProgress,
      monthlyReviews: kpiReviews,
      quarterlySummaries,
      phasePromotions,
    });

    const monthlyKpi = [...kpiReviews].map((review) => {
      const summary = getRecord(review.summary);
      const improvementPlan = getRecord(review.improvementPlan);
      const promotionSignal = getRecord(review.promotionSignal);

      return {
        reviewId: review.id,
        candidateId: review.candidateId,
        fullName: review.fullName,
        candidateCode: review.candidateCode,
        programName: review.programName,
        batchName: review.batchName,
        reviewPeriod: review.reviewPeriod,
        overallScore: review.overallScore,
        status: review.status,
        overallRating: getString(summary.overallRating),
        improvementRequired: getBoolean(improvementPlan.improvementRequired),
        promotionWatch: getBoolean(promotionSignal.promotionWatch),
        readyForPromotion: getBoolean(promotionSignal.readyForPromotion),
        completedAt: review.completedAt?.toISOString() ?? null,
      };
    });

    const quarterlyKpi = [...quarterlySummaries].map((summary) => {
      const rollup = getRecord(summary.rollup);

      return {
        summaryId: summary.id,
        candidateId: summary.candidateId,
        fullName: summary.fullName,
        candidateCode: summary.candidateCode,
        programName: summary.programName,
        batchName: summary.batchName,
        reviewYear: summary.reviewYear,
        reviewQuarter: summary.reviewQuarter,
        quarterlyAverageScore: getNumber(rollup.quarterlyAverageScore),
        outcome: summary.outcome,
        status: summary.status,
        totalQuarterlyHours: getNumber(rollup.totalQuarterlyHours) ?? 0,
        completedAt: summary.completedAt?.toISOString() ?? null,
      };
    });

    const promotionPipelineRecords = [...phasePromotions].map((review) => ({
      reviewId: review.id,
      candidateId: review.candidateId,
      fullName: review.fullName,
      candidateCode: review.candidateCode,
      programName: review.programName,
      batchName: review.batchName,
      currentPhase: review.currentPhase,
      proposedNextPhase: review.proposedNextPhase,
      proposedNextDesignation: review.proposedNextDesignation,
      promotionEffectiveDate: review.promotionEffectiveDate,
      preparedDate: review.preparedDate,
      status: review.status,
      programAdminDecision: getString(getRecord(review.programAdminReview).decision),
      superAdminDecision: getString(getRecord(review.superAdminDecision).decision),
      candidateAcknowledgedAt: review.candidateAcknowledgedAt?.toISOString() ?? null,
    }));

    const promotionPipelineSummary = {
      draft: phasePromotions.filter((review) => review.status === "draft").length,
      submitted: phasePromotions.filter((review) => review.status === "submitted").length,
      underReview: phasePromotions.filter((review) => review.status === "under_review").length,
      revisionRequired: phasePromotions.filter((review) => review.status === "revision_required")
        .length,
      approved: phasePromotions.filter((review) => review.status === "approved").length,
      rejected: phasePromotions.filter((review) => review.status === "rejected").length,
    };

    const submissionCompliance = candidateProgress.map((candidate) => ({
      candidateId: candidate.candidateId,
      fullName: candidate.fullName,
      candidateCode: candidate.candidateCode,
      programName: candidate.programName,
      batchName: candidate.batchName,
      dailyLogSubmittedCount: candidate.dailyLogCount,
      dailyLogApprovedCount: candidate.approvedDailyLogCount,
      timesheetSubmittedCount: candidate.timesheetCount,
      timesheetApprovedCount: candidate.approvedTimesheetCount,
      taskAssignedCount: candidate.taskAssignedCount,
      taskApprovedCount: candidate.taskApprovedCount,
      taskRevisionCount: candidate.taskRevisionCount,
      dailyLogApprovalRate: percentage(candidate.approvedDailyLogCount, candidate.dailyLogCount),
      timesheetApprovalRate: percentage(
        candidate.approvedTimesheetCount,
        candidate.timesheetCount,
      ),
      taskApprovalRate: percentage(candidate.taskApprovedCount, candidate.taskAssignedCount),
    }));

    const completedMonthlyScores = monthlyKpi
      .map((review) => review.overallScore)
      .filter((score): score is number => score !== null && score >= 0);
    const completedQuarterlyScores = quarterlyKpi
      .map((summary) => summary.quarterlyAverageScore)
      .filter((score): score is number => score !== null && score >= 0);

    return {
      filters: {
        programId: input.programId ?? null,
        batchId: input.batchId ?? null,
        candidateId: input.candidateId ?? null,
      },
      summary: {
        candidateCount: candidates.length,
        activeCandidateCount: candidates.filter((candidate) => candidate.status === "active")
          .length,
        completedMonthlyKpiCount: monthlyKpi.filter((review) => review.completedAt !== null)
          .length,
        completedQuarterlySummaryCount: quarterlyKpi.filter(
          (summary) => summary.completedAt !== null,
        ).length,
        activePromotionReviewCount: phasePromotions.filter(
          (review) => !["approved", "rejected"].includes(review.status),
        ).length,
        approvedPromotionCount: phasePromotions.filter((review) => review.status === "approved")
          .length,
        overallAverageMonthlyKpiScore:
          completedMonthlyScores.length > 0
            ? round(
                completedMonthlyScores.reduce((total, score) => total + score, 0) /
                  completedMonthlyScores.length,
              )
            : null,
        overallAverageQuarterlyKpiScore:
          completedQuarterlyScores.length > 0
            ? round(
                completedQuarterlyScores.reduce((total, score) => total + score, 0) /
                  completedQuarterlyScores.length,
              )
            : null,
      },
      candidateProgress,
      scopePerformance,
      monthlyKpi,
      quarterlyKpi,
      promotionPipeline: {
        summary: promotionPipelineSummary,
        records: promotionPipelineRecords,
      },
      submissionCompliance,
    };
  }

  private groupByCandidate<
    TRecord extends {
      candidateId: string;
    },
  >(records: TRecord[]) {
    const grouped = new Map<string, TRecord[]>();

    for (const record of records) {
      const existing = grouped.get(record.candidateId);
      if (existing) {
        existing.push(record);
      } else {
        grouped.set(record.candidateId, [record]);
      }
    }

    return grouped;
  }

  private buildScopePerformance(input: {
    candidates: ReportCandidateRecord[];
    candidateProgress: Array<{
      candidateId: string;
      programId: string;
      programName: string;
      batchId: string | null;
      batchName: string | null;
      dailyLogCount: number;
      approvedDailyLogCount: number;
      timesheetCount: number;
      approvedTimesheetCount: number;
      taskAssignedCount: number;
      taskApprovedCount: number;
    }>;
    monthlyReviews: ReportKpiReviewRecord[];
    quarterlySummaries: ReportQuarterlyKpiSummaryRecord[];
    phasePromotions: ReportPhasePromotionRecord[];
  }) {
    const monthlyByCandidate = this.groupByCandidate(input.monthlyReviews);
    const quarterlyByCandidate = this.groupByCandidate(input.quarterlySummaries);
    const promotionsByCandidate = this.groupByCandidate(input.phasePromotions);

    const scopes = new Map<
      string,
      {
        scopeType: "program" | "batch";
        scopeId: string;
        scopeName: string;
        programId: string;
        programName: string;
        candidateIds: string[];
      }
    >();

    for (const candidate of input.candidates) {
      const programKey = `program:${candidate.programId}`;
      if (!scopes.has(programKey)) {
        scopes.set(programKey, {
          scopeType: "program",
          scopeId: candidate.programId,
          scopeName: candidate.programName,
          programId: candidate.programId,
          programName: candidate.programName,
          candidateIds: [],
        });
      }
      scopes.get(programKey)?.candidateIds.push(candidate.id);

      const batchScopeId = candidate.batchId ?? `unassigned:${candidate.programId}`;
      const batchScopeName = candidate.batchName ?? "Unassigned Batch";
      const batchKey = `batch:${batchScopeId}`;
      if (!scopes.has(batchKey)) {
        scopes.set(batchKey, {
          scopeType: "batch",
          scopeId: batchScopeId,
          scopeName: batchScopeName,
          programId: candidate.programId,
          programName: candidate.programName,
          candidateIds: [],
        });
      }
      scopes.get(batchKey)?.candidateIds.push(candidate.id);
    }

    return [...scopes.values()].map((scope) => {
      const candidateRows = input.candidateProgress.filter((candidate) =>
        scope.candidateIds.includes(candidate.candidateId),
      );
      const monthlyScores = scope.candidateIds.flatMap((candidateId) =>
        (monthlyByCandidate.get(candidateId) ?? [])
          .filter((review) => review.completedAt !== null && review.overallScore !== null)
          .map((review) => review.overallScore as number),
      );
      const quarterlyScores = scope.candidateIds.flatMap((candidateId) =>
        (quarterlyByCandidate.get(candidateId) ?? [])
          .filter((summary) => summary.completedAt !== null)
          .map((summary) => getNumber(getRecord(summary.rollup).quarterlyAverageScore))
          .filter((score): score is number => score !== null),
      );
      const promotionReadyCount = scope.candidateIds.filter((candidateId) => {
        const monthlyReady = (monthlyByCandidate.get(candidateId) ?? []).some((review) =>
          getBoolean(getRecord(review.promotionSignal).readyForPromotion),
        );
        const quarterlyReady = (quarterlyByCandidate.get(candidateId) ?? []).some(
          (summary) => summary.outcome === "promotion_track_candidate",
        );

        return monthlyReady || quarterlyReady;
      }).length;
      const revisionRequiredCount = scope.candidateIds.filter((candidateId) =>
        (promotionsByCandidate.get(candidateId) ?? []).some(
          (review) => review.status === "revision_required",
        ),
      ).length;

      const totalDailyLogs = candidateRows.reduce(
        (total, candidate) => total + candidate.dailyLogCount,
        0,
      );
      const approvedDailyLogs = candidateRows.reduce(
        (total, candidate) => total + candidate.approvedDailyLogCount,
        0,
      );
      const totalTimesheets = candidateRows.reduce(
        (total, candidate) => total + candidate.timesheetCount,
        0,
      );
      const approvedTimesheets = candidateRows.reduce(
        (total, candidate) => total + candidate.approvedTimesheetCount,
        0,
      );
      const totalTasks = candidateRows.reduce(
        (total, candidate) => total + candidate.taskAssignedCount,
        0,
      );
      const approvedTasks = candidateRows.reduce(
        (total, candidate) => total + candidate.taskApprovedCount,
        0,
      );

      return {
        scopeType: scope.scopeType,
        scopeId: scope.scopeId,
        scopeName: scope.scopeName,
        programId: scope.programId,
        programName: scope.programName,
        candidateCount: candidateRows.length,
        activeCandidateCount: input.candidates.filter(
          (candidate) =>
            scope.candidateIds.includes(candidate.id) && candidate.status === "active",
        ).length,
        averageMonthlyKpiScore:
          monthlyScores.length > 0
            ? round(
                monthlyScores.reduce((total, score) => total + score, 0) / monthlyScores.length,
              )
            : null,
        averageQuarterlyKpiScore:
          quarterlyScores.length > 0
            ? round(
                quarterlyScores.reduce((total, score) => total + score, 0) /
                  quarterlyScores.length,
              )
            : null,
        dailyLogApprovalRate: percentage(approvedDailyLogs, totalDailyLogs),
        timesheetApprovalRate: percentage(approvedTimesheets, totalTimesheets),
        taskApprovalRate: percentage(approvedTasks, totalTasks),
        promotionReadyCount,
        revisionRequiredCount,
      };
    });
  }
}
