import {
  batchAssignments,
  batches,
  calls,
  candidateLogs,
  candidates,
  db,
  kpiReviews,
  phasePromotionReviews,
  programAssignments,
  programs,
  quarterlyKpiSummaries,
  taskBriefs,
  timesheets,
  users,
} from "@lms/db";
import type { Role, UserStatus, WorkflowStatus } from "@lms/shared";
import { and, desc, eq, inArray, isNull, type SQL } from "drizzle-orm";

export type ReportCandidateRecord = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  programId: string;
  programName: string;
  batchId: string | null;
  batchName: string | null;
  candidateCode: string;
  currentPhase: string | null;
  currentDesignation: string | null;
  status: UserStatus;
  isActive: boolean;
};

export type ReportKpiReviewRecord = {
  id: string;
  candidateId: string;
  fullName: string;
  candidateCode: string;
  programName: string;
  batchName: string | null;
  reviewPeriod: string;
  overallScore: number | null;
  status: WorkflowStatus;
  summary: unknown;
  improvementPlan: unknown;
  promotionSignal: unknown;
  completedAt: Date | null;
};

export type ReportQuarterlyKpiSummaryRecord = {
  id: string;
  candidateId: string;
  fullName: string;
  candidateCode: string;
  programName: string;
  batchName: string | null;
  reviewYear: number;
  reviewQuarter: number;
  status: WorkflowStatus;
  outcome: string | null;
  rollup: unknown;
  completedAt: Date | null;
};

export type ReportPhasePromotionRecord = {
  id: string;
  candidateId: string;
  fullName: string;
  candidateCode: string;
  programName: string;
  batchName: string | null;
  currentPhase: string;
  proposedNextPhase: string;
  proposedNextDesignation: string;
  promotionEffectiveDate: string;
  preparedDate: string;
  status: WorkflowStatus;
  programAdminReview: unknown;
  superAdminDecision: unknown;
  candidateAcknowledgedAt: Date | null;
};

export type ReportTimesheetRecord = {
  id: string;
  candidateId: string;
  totalMinutes: number;
  status: WorkflowStatus;
};

export type ReportCandidateLogRecord = {
  id: string;
  candidateId: string;
  minutesSpent: number;
  status: WorkflowStatus;
};

export type ReportTaskBriefRecord = {
  id: string;
  candidateId: string;
  status: WorkflowStatus;
};

export type ReportCallRecord = {
  id: string;
  candidateId: string;
  status: WorkflowStatus;
};

export class ReportsRepository {
  async listCandidates(input: {
    role: Role;
    actorId: string;
    programId?: string;
    batchId?: string;
    candidateId?: string;
  }) {
    const conditions = await this.buildCandidateScopeConditions(input.role, input.actorId);
    conditions.push(isNull(candidates.deletedAt));

    if (input.programId) {
      conditions.push(eq(candidates.programId, input.programId));
    }

    if (input.batchId) {
      conditions.push(eq(candidates.batchId, input.batchId));
    }

    if (input.candidateId) {
      conditions.push(eq(candidates.id, input.candidateId));
    }

    return db
      .select({
        id: candidates.id,
        userId: candidates.userId,
        fullName: users.fullName,
        email: users.email,
        programId: candidates.programId,
        programName: programs.name,
        batchId: candidates.batchId,
        batchName: batches.name,
        candidateCode: candidates.candidateCode,
        currentPhase: candidates.currentPhase,
        currentDesignation: candidates.currentDesignation,
        status: candidates.status,
        isActive: candidates.isActive,
      })
      .from(candidates)
      .innerJoin(users, eq(users.id, candidates.userId))
      .innerJoin(programs, eq(programs.id, candidates.programId))
      .leftJoin(batches, eq(batches.id, candidates.batchId))
      .where(and(...conditions))
      .orderBy(users.fullName);
  }

  async listKpiReviews(candidateIds: string[]) {
    if (candidateIds.length === 0) {
      return [] satisfies ReportKpiReviewRecord[];
    }

    return db
      .select({
        id: kpiReviews.id,
        candidateId: kpiReviews.candidateId,
        fullName: users.fullName,
        candidateCode: candidates.candidateCode,
        programName: programs.name,
        batchName: batches.name,
        reviewPeriod: kpiReviews.reviewPeriod,
        overallScore: kpiReviews.overallScore,
        status: kpiReviews.status,
        summary: kpiReviews.summary,
        improvementPlan: kpiReviews.improvementPlan,
        promotionSignal: kpiReviews.promotionSignal,
        completedAt: kpiReviews.completedAt,
      })
      .from(kpiReviews)
      .innerJoin(candidates, eq(candidates.id, kpiReviews.candidateId))
      .innerJoin(users, eq(users.id, candidates.userId))
      .innerJoin(programs, eq(programs.id, candidates.programId))
      .leftJoin(batches, eq(batches.id, candidates.batchId))
      .where(and(inArray(kpiReviews.candidateId, candidateIds), isNull(kpiReviews.deletedAt)))
      .orderBy(desc(kpiReviews.reviewPeriod), users.fullName);
  }

  async listQuarterlySummaries(candidateIds: string[]) {
    if (candidateIds.length === 0) {
      return [] satisfies ReportQuarterlyKpiSummaryRecord[];
    }

    return db
      .select({
        id: quarterlyKpiSummaries.id,
        candidateId: quarterlyKpiSummaries.candidateId,
        fullName: users.fullName,
        candidateCode: candidates.candidateCode,
        programName: programs.name,
        batchName: batches.name,
        reviewYear: quarterlyKpiSummaries.reviewYear,
        reviewQuarter: quarterlyKpiSummaries.reviewQuarter,
        status: quarterlyKpiSummaries.status,
        outcome: quarterlyKpiSummaries.outcome,
        rollup: quarterlyKpiSummaries.rollup,
        completedAt: quarterlyKpiSummaries.completedAt,
      })
      .from(quarterlyKpiSummaries)
      .innerJoin(candidates, eq(candidates.id, quarterlyKpiSummaries.candidateId))
      .innerJoin(users, eq(users.id, candidates.userId))
      .innerJoin(programs, eq(programs.id, candidates.programId))
      .leftJoin(batches, eq(batches.id, candidates.batchId))
      .where(
        and(
          inArray(quarterlyKpiSummaries.candidateId, candidateIds),
          isNull(quarterlyKpiSummaries.deletedAt),
        ),
      )
      .orderBy(
        desc(quarterlyKpiSummaries.reviewYear),
        desc(quarterlyKpiSummaries.reviewQuarter),
        users.fullName,
      );
  }

  async listPhasePromotions(candidateIds: string[]) {
    if (candidateIds.length === 0) {
      return [] satisfies ReportPhasePromotionRecord[];
    }

    return db
      .select({
        id: phasePromotionReviews.id,
        candidateId: phasePromotionReviews.candidateId,
        fullName: users.fullName,
        candidateCode: candidates.candidateCode,
        programName: programs.name,
        batchName: batches.name,
        currentPhase: phasePromotionReviews.currentPhase,
        proposedNextPhase: phasePromotionReviews.proposedNextPhase,
        proposedNextDesignation: phasePromotionReviews.proposedNextDesignation,
        promotionEffectiveDate: phasePromotionReviews.promotionEffectiveDate,
        preparedDate: phasePromotionReviews.preparedDate,
        status: phasePromotionReviews.status,
        programAdminReview: phasePromotionReviews.programAdminReview,
        superAdminDecision: phasePromotionReviews.superAdminDecision,
        candidateAcknowledgedAt: phasePromotionReviews.candidateAcknowledgedAt,
      })
      .from(phasePromotionReviews)
      .innerJoin(candidates, eq(candidates.id, phasePromotionReviews.candidateId))
      .innerJoin(users, eq(users.id, candidates.userId))
      .innerJoin(programs, eq(programs.id, candidates.programId))
      .leftJoin(batches, eq(batches.id, candidates.batchId))
      .where(
        and(
          inArray(phasePromotionReviews.candidateId, candidateIds),
          isNull(phasePromotionReviews.deletedAt),
        ),
      )
      .orderBy(desc(phasePromotionReviews.preparedDate), users.fullName);
  }

  async listTimesheets(candidateIds: string[]) {
    if (candidateIds.length === 0) {
      return [] satisfies ReportTimesheetRecord[];
    }

    return db
      .select({
        id: timesheets.id,
        candidateId: timesheets.candidateId,
        totalMinutes: timesheets.totalMinutes,
        status: timesheets.status,
      })
      .from(timesheets)
      .where(and(inArray(timesheets.candidateId, candidateIds), isNull(timesheets.deletedAt)));
  }

  async listCandidateLogs(candidateIds: string[]) {
    if (candidateIds.length === 0) {
      return [] satisfies ReportCandidateLogRecord[];
    }

    return db
      .select({
        id: candidateLogs.id,
        candidateId: candidateLogs.candidateId,
        minutesSpent: candidateLogs.minutesSpent,
        status: candidateLogs.status,
      })
      .from(candidateLogs)
      .where(
        and(inArray(candidateLogs.candidateId, candidateIds), isNull(candidateLogs.deletedAt)),
      );
  }

  async listTaskBriefs(candidateIds: string[]) {
    if (candidateIds.length === 0) {
      return [] satisfies ReportTaskBriefRecord[];
    }

    return db
      .select({
        id: taskBriefs.id,
        candidateId: taskBriefs.candidateId,
        status: taskBriefs.status,
      })
      .from(taskBriefs)
      .where(and(inArray(taskBriefs.candidateId, candidateIds), isNull(taskBriefs.deletedAt)));
  }

  async listCalls(candidateIds: string[]) {
    if (candidateIds.length === 0) {
      return [] satisfies ReportCallRecord[];
    }

    return db
      .select({
        id: calls.id,
        candidateId: calls.candidateId,
        status: calls.status,
      })
      .from(calls)
      .where(and(inArray(calls.candidateId, candidateIds), isNull(calls.deletedAt)));
  }

  private async buildCandidateScopeConditions(role: Role, actorId: string) {
    const conditions: SQL[] = [];

    if (role === "Program Admin") {
      const programIds = await this.listAssignedProgramIds(actorId);
      conditions.push(
        programIds.length > 0 ? inArray(candidates.programId, programIds) : eq(candidates.id, ""),
      );
    }

    if (role === "Program Lead") {
      const batchIds = await this.listAssignedBatchIds(actorId);
      conditions.push(
        batchIds.length > 0 ? inArray(candidates.batchId, batchIds) : eq(candidates.id, ""),
      );
    }

    if (role === "Candidate") {
      conditions.push(eq(candidates.userId, actorId));
    }

    return conditions;
  }

  private async listAssignedProgramIds(userId: string) {
    const rows = await db
      .select({ programId: programAssignments.programId })
      .from(programAssignments)
      .where(
        and(
          eq(programAssignments.userId, userId),
          eq(programAssignments.role, "Program Admin"),
          isNull(programAssignments.deletedAt),
        ),
      );

    return rows.map((row) => row.programId);
  }

  private async listAssignedBatchIds(userId: string) {
    const rows = await db
      .select({ batchId: batchAssignments.batchId })
      .from(batchAssignments)
      .where(
        and(
          eq(batchAssignments.userId, userId),
          eq(batchAssignments.role, "Program Lead"),
          isNull(batchAssignments.deletedAt),
        ),
      );

    return rows.map((row) => row.batchId);
  }
}
