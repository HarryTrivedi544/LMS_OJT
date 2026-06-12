import {
  auditLogs,
  batchAssignments,
  batches,
  calls,
  candidateLogs,
  candidates,
  db,
  domainEvents,
  kpiReviews,
  programAssignments,
  programs,
  quarterlyKpiSummaries,
  taskBriefs,
  timesheets,
  users,
} from "@lms/db";
import type { ActorType, Role, WorkflowStatus } from "@lms/shared";
import { and, desc, eq, gte, inArray, isNull, lte, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const reviewerUsers = alias(users, "quarterly_reviewer_users");

export type QuarterlyKpiMonthlyAverageRecord = {
  reviewPeriod: string;
  overallScore: number;
};

export type QuarterlyKpiLinkedMonthlyReviewRecord = {
  id: string;
  reviewPeriod: string;
  overallScore: number;
  status: string;
};

export type QuarterlyKpiWorkflowSummariesRecord = {
  timesheetSubmissionSummary: string | null;
  dailyLogConsistencySummary: string | null;
  taskCompletionSummary: string | null;
  callEngagementSummary: string | null;
};

export type QuarterlyKpiRollupRecord = {
  monthlyAverageScores: QuarterlyKpiMonthlyAverageRecord[];
  quarterlyAverageScore: number | null;
  totalQuarterlyHours: number;
  averageMonthlyHours: number;
  timesheetCount: number;
  approvedTimesheetCount: number;
  dailyLogCount: number;
  approvedDailyLogCount: number;
  taskAssignedCount: number;
  taskApprovedCount: number;
  taskRevisionCount: number;
  callCount: number;
  cancelledCallCount: number;
  linkedMonthlyKpiReviews: QuarterlyKpiLinkedMonthlyReviewRecord[];
  workflowSummaries: QuarterlyKpiWorkflowSummariesRecord;
};

export type QuarterlyKpiAssessmentRecord = {
  technicalGrowthSummary: string | null;
  deliveryConsistencySummary: string | null;
  communicationCollaborationSummary: string | null;
  ownershipIndependenceSummary: string | null;
  reviewResponsivenessSummary: string | null;
  riskFlags: string | null;
  strengths: string[];
  improvementPriorities: string[];
  recommendedFocus: string | null;
};

export type QuarterlyKpiActionPlanRecord = {
  nextQuarterGoals: string | null;
  expectedSkillImprovements: string | null;
  expectedDeliveryImprovements: string | null;
  supportRequired: string | null;
  followUpDate: string | null;
};

export type QuarterlyKpiOutcomeRecord =
  | "on_track"
  | "on_track_with_support"
  | "needs_improvement_plan"
  | "promotion_track_candidate"
  | "not_ready_for_promotion_track";

export type QuarterlyKpiSummaryRecord = {
  id: string;
  candidateId: string;
  userId: string;
  fullName: string;
  email: string;
  candidateCode: string;
  programId: string;
  programName: string;
  batchId: string | null;
  batchName: string | null;
  reviewerId: string;
  reviewerName: string;
  reviewYear: number;
  reviewQuarter: number;
  reviewDate: string | null;
  reviewPeriodStart: string;
  reviewPeriodEnd: string;
  currentPhase: string | null;
  currentDesignation: string | null;
  rollup: QuarterlyKpiRollupRecord;
  assessment: QuarterlyKpiAssessmentRecord;
  actionPlan: QuarterlyKpiActionPlanRecord;
  outcome: QuarterlyKpiOutcomeRecord | null;
  feedback: string | null;
  status: WorkflowStatus;
  completedAt: Date | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

const quarterlySummarySelect = {
  id: quarterlyKpiSummaries.id,
  candidateId: quarterlyKpiSummaries.candidateId,
  userId: candidates.userId,
  fullName: users.fullName,
  email: users.email,
  candidateCode: candidates.candidateCode,
  programId: candidates.programId,
  programName: programs.name,
  batchId: candidates.batchId,
  batchName: batches.name,
  reviewerId: quarterlyKpiSummaries.reviewerId,
  reviewerName: reviewerUsers.fullName,
  reviewYear: quarterlyKpiSummaries.reviewYear,
  reviewQuarter: quarterlyKpiSummaries.reviewQuarter,
  reviewDate: quarterlyKpiSummaries.reviewDate,
  reviewPeriodStart: quarterlyKpiSummaries.reviewPeriodStart,
  reviewPeriodEnd: quarterlyKpiSummaries.reviewPeriodEnd,
  currentPhase: quarterlyKpiSummaries.currentPhase,
  currentDesignation: quarterlyKpiSummaries.currentDesignation,
  rollup: quarterlyKpiSummaries.rollup,
  assessment: quarterlyKpiSummaries.assessment,
  actionPlan: quarterlyKpiSummaries.actionPlan,
  outcome: quarterlyKpiSummaries.outcome,
  feedback: quarterlyKpiSummaries.feedback,
  status: quarterlyKpiSummaries.status,
  completedAt: quarterlyKpiSummaries.completedAt,
  reviewedAt: quarterlyKpiSummaries.reviewedAt,
  reviewedBy: quarterlyKpiSummaries.reviewedBy,
  reviewNote: quarterlyKpiSummaries.reviewNote,
  isActive: quarterlyKpiSummaries.isActive,
  createdAt: quarterlyKpiSummaries.createdAt,
  updatedAt: quarterlyKpiSummaries.updatedAt,
  deletedAt: quarterlyKpiSummaries.deletedAt,
};

const emptyWorkflowSummaries: QuarterlyKpiWorkflowSummariesRecord = {
  timesheetSubmissionSummary: null,
  dailyLogConsistencySummary: null,
  taskCompletionSummary: null,
  callEngagementSummary: null,
};

const emptyRollup: QuarterlyKpiRollupRecord = {
  monthlyAverageScores: [],
  quarterlyAverageScore: null,
  totalQuarterlyHours: 0,
  averageMonthlyHours: 0,
  timesheetCount: 0,
  approvedTimesheetCount: 0,
  dailyLogCount: 0,
  approvedDailyLogCount: 0,
  taskAssignedCount: 0,
  taskApprovedCount: 0,
  taskRevisionCount: 0,
  callCount: 0,
  cancelledCallCount: 0,
  linkedMonthlyKpiReviews: [],
  workflowSummaries: emptyWorkflowSummaries,
};

const emptyAssessment: QuarterlyKpiAssessmentRecord = {
  technicalGrowthSummary: null,
  deliveryConsistencySummary: null,
  communicationCollaborationSummary: null,
  ownershipIndependenceSummary: null,
  reviewResponsivenessSummary: null,
  riskFlags: null,
  strengths: [],
  improvementPriorities: [],
  recommendedFocus: null,
};

const emptyActionPlan: QuarterlyKpiActionPlanRecord = {
  nextQuarterGoals: null,
  expectedSkillImprovements: null,
  expectedDeliveryImprovements: null,
  supportRequired: null,
  followUpDate: null,
};

const quarterlyOutcomeValues = new Set<QuarterlyKpiOutcomeRecord>([
  "on_track",
  "on_track_with_support",
  "needs_improvement_plan",
  "promotion_track_candidate",
  "not_ready_for_promotion_track",
]);

export class QuarterlyKpiSummariesRepository {
  async list(input: {
    role: Role;
    actorId: string;
    programId?: string;
    batchId?: string;
    candidateId?: string;
    status?: WorkflowStatus;
    reviewYear?: number;
    reviewQuarter?: number;
    includeArchived?: boolean;
  }) {
    const conditions = await this.buildScopeConditions(input.role, input.actorId);

    if (!input.includeArchived) {
      conditions.push(isNull(quarterlyKpiSummaries.deletedAt));
    }

    if (input.programId) {
      conditions.push(eq(candidates.programId, input.programId));
    }

    if (input.batchId) {
      conditions.push(eq(candidates.batchId, input.batchId));
    }

    if (input.candidateId) {
      conditions.push(eq(quarterlyKpiSummaries.candidateId, input.candidateId));
    }

    if (input.status) {
      conditions.push(eq(quarterlyKpiSummaries.status, input.status));
    }

    if (input.reviewYear) {
      conditions.push(eq(quarterlyKpiSummaries.reviewYear, input.reviewYear));
    }

    if (input.reviewQuarter) {
      conditions.push(eq(quarterlyKpiSummaries.reviewQuarter, input.reviewQuarter));
    }

    return this.baseQuery(conditions);
  }

  async findById(id: string, includeArchived = false) {
    const conditions: SQL[] = [eq(quarterlyKpiSummaries.id, id)];

    if (!includeArchived) {
      conditions.push(isNull(quarterlyKpiSummaries.deletedAt));
    }

    const [summary] = await this.baseQuery(conditions, 1);
    return summary ?? null;
  }

  async findByCandidateAndQuarter(candidateId: string, reviewYear: number, reviewQuarter: number) {
    const [summary] = await this.baseQuery(
      [
        eq(quarterlyKpiSummaries.candidateId, candidateId),
        eq(quarterlyKpiSummaries.reviewYear, reviewYear),
        eq(quarterlyKpiSummaries.reviewQuarter, reviewQuarter),
        isNull(quarterlyKpiSummaries.deletedAt),
      ],
      1,
    );

    return summary ?? null;
  }

  async canAccessCandidate(input: {
    candidateId: string;
    role: Role;
    actorId: string;
    includeArchived?: boolean;
  }) {
    const conditions = await this.buildCandidateScopeConditions(input.role, input.actorId);
    conditions.push(eq(candidates.id, input.candidateId));

    if (!input.includeArchived) {
      conditions.push(isNull(candidates.deletedAt));
    }

    const [candidate] = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(and(...conditions))
      .limit(1);

    return Boolean(candidate);
  }

  async canAccessQuarterlySummary(input: {
    quarterlySummaryId: string;
    role: Role;
    actorId: string;
    includeArchived?: boolean;
  }) {
    const conditions = await this.buildScopeConditions(input.role, input.actorId);
    conditions.push(eq(quarterlyKpiSummaries.id, input.quarterlySummaryId));

    if (!input.includeArchived) {
      conditions.push(isNull(quarterlyKpiSummaries.deletedAt));
    }

    const [summary] = await db
      .select({ id: quarterlyKpiSummaries.id })
      .from(quarterlyKpiSummaries)
      .innerJoin(candidates, eq(candidates.id, quarterlyKpiSummaries.candidateId))
      .where(and(...conditions))
      .limit(1);

    return Boolean(summary);
  }

  async buildRollup(input: {
    candidateId: string;
    reviewYear: number;
    reviewQuarter: number;
    reviewPeriodStart: string;
    reviewPeriodEnd: string;
  }): Promise<QuarterlyKpiRollupRecord> {
    const monthlyPeriods = this.listQuarterMonths(input.reviewYear, input.reviewQuarter);

    const monthlyReviews = await db
      .select({
        id: kpiReviews.id,
        reviewPeriod: kpiReviews.reviewPeriod,
        overallScore: kpiReviews.overallScore,
        status: kpiReviews.status,
      })
      .from(kpiReviews)
      .where(
        and(
          eq(kpiReviews.candidateId, input.candidateId),
          inArray(kpiReviews.reviewPeriod, monthlyPeriods),
          eq(kpiReviews.status, "approved"),
          isNull(kpiReviews.deletedAt),
        ),
      )
      .orderBy(desc(kpiReviews.reviewPeriod));

    const timesheetRows = await db
      .select({
        totalMinutes: timesheets.totalMinutes,
        status: timesheets.status,
      })
      .from(timesheets)
      .where(
        and(
          eq(timesheets.candidateId, input.candidateId),
          gte(timesheets.weekStartDate, input.reviewPeriodStart),
          lte(timesheets.weekStartDate, input.reviewPeriodEnd),
          isNull(timesheets.deletedAt),
        ),
      );

    const dailyLogRows = await db
      .select({
        status: candidateLogs.status,
      })
      .from(candidateLogs)
      .where(
        and(
          eq(candidateLogs.candidateId, input.candidateId),
          gte(candidateLogs.logDate, input.reviewPeriodStart),
          lte(candidateLogs.logDate, input.reviewPeriodEnd),
          isNull(candidateLogs.deletedAt),
        ),
      );

    const taskRows = await db
      .select({
        status: taskBriefs.status,
      })
      .from(taskBriefs)
      .where(
        and(
          eq(taskBriefs.candidateId, input.candidateId),
          gte(sql<string>`coalesce(${taskBriefs.submittedAt}::date, ${taskBriefs.createdAt}::date)`, input.reviewPeriodStart),
          lte(sql<string>`coalesce(${taskBriefs.submittedAt}::date, ${taskBriefs.createdAt}::date)`, input.reviewPeriodEnd),
          isNull(taskBriefs.deletedAt),
        ),
      );

    const callRows = await db
      .select({
        status: calls.status,
      })
      .from(calls)
      .where(
        and(
          eq(calls.candidateId, input.candidateId),
          gte(sql<string>`${calls.scheduledStartAt}::date`, input.reviewPeriodStart),
          lte(sql<string>`${calls.scheduledStartAt}::date`, input.reviewPeriodEnd),
          isNull(calls.deletedAt),
        ),
      );

    const monthlyAverageScores = monthlyReviews
      .filter((review) => review.overallScore !== null)
      .map((review) => ({
        reviewPeriod: review.reviewPeriod,
        overallScore: review.overallScore ?? 0,
      }));

    const linkedMonthlyKpiReviews = monthlyReviews
      .filter((review) => review.overallScore !== null)
      .map((review) => ({
        id: review.id,
        reviewPeriod: review.reviewPeriod,
        overallScore: review.overallScore ?? 0,
        status: review.status,
      }));

    const quarterlyAverageScore =
      monthlyAverageScores.length > 0
        ? Number(
            (
              monthlyAverageScores.reduce((total, entry) => total + entry.overallScore, 0) /
              monthlyAverageScores.length
            ).toFixed(2),
          )
        : null;

    const totalQuarterlyHours = Number(
      (
        timesheetRows.reduce((total, row) => total + row.totalMinutes, 0) / 60
      ).toFixed(2),
    );

    const timesheetCount = timesheetRows.length;
    const approvedTimesheetCount = timesheetRows.filter((row) => row.status === "approved").length;
    const dailyLogCount = dailyLogRows.length;
    const approvedDailyLogCount = dailyLogRows.filter((row) => row.status === "approved").length;
    const taskAssignedCount = taskRows.length;
    const taskApprovedCount = taskRows.filter((row) => row.status === "approved").length;
    const taskRevisionCount = taskRows.filter((row) => row.status === "revision_required").length;
    const callCount = callRows.length;
    const cancelledCallCount = callRows.filter((row) => row.status === "cancelled").length;

    return {
      monthlyAverageScores,
      quarterlyAverageScore,
      totalQuarterlyHours,
      averageMonthlyHours: Number((totalQuarterlyHours / 3).toFixed(2)),
      timesheetCount,
      approvedTimesheetCount,
      dailyLogCount,
      approvedDailyLogCount,
      taskAssignedCount,
      taskApprovedCount,
      taskRevisionCount,
      callCount,
      cancelledCallCount,
      linkedMonthlyKpiReviews,
      workflowSummaries: {
        timesheetSubmissionSummary:
          timesheetCount > 0
            ? `${approvedTimesheetCount}/${timesheetCount} timesheets approved in quarter.`
            : "No timesheets submitted in quarter.",
        dailyLogConsistencySummary:
          dailyLogCount > 0
            ? `${approvedDailyLogCount}/${dailyLogCount} daily logs approved in quarter.`
            : "No daily logs submitted in quarter.",
        taskCompletionSummary:
          taskAssignedCount > 0
            ? `${taskApprovedCount} approved, ${taskRevisionCount} sent for revision out of ${taskAssignedCount} tasks.`
            : "No task brief activity in quarter.",
        callEngagementSummary:
          callCount > 0
            ? `${callCount} calls scheduled (${cancelledCallCount} cancelled).`
            : "No mentoring or review calls in quarter.",
      },
    };
  }

  async create(input: {
    candidateId: string;
    reviewerId: string;
    reviewYear: number;
    reviewQuarter: number;
    reviewDate: string;
    reviewPeriodStart: string;
    reviewPeriodEnd: string;
    currentPhase: string;
    currentDesignation: string;
    rollup: QuarterlyKpiRollupRecord;
    assessment: QuarterlyKpiAssessmentRecord;
    actionPlan: QuarterlyKpiActionPlanRecord;
    outcome?: QuarterlyKpiOutcomeRecord;
    feedback?: string;
  }) {
    const [summary] = await db
      .insert(quarterlyKpiSummaries)
      .values({
        candidateId: input.candidateId,
        reviewerId: input.reviewerId,
        reviewYear: input.reviewYear,
        reviewQuarter: input.reviewQuarter,
        reviewDate: input.reviewDate,
        reviewPeriodStart: input.reviewPeriodStart,
        reviewPeriodEnd: input.reviewPeriodEnd,
        currentPhase: input.currentPhase,
        currentDesignation: input.currentDesignation,
        rollup: input.rollup,
        assessment: input.assessment,
        actionPlan: input.actionPlan,
        outcome: input.outcome,
        feedback: input.feedback,
        status: "draft",
        createdBy: input.reviewerId,
        updatedBy: input.reviewerId,
      })
      .returning({ id: quarterlyKpiSummaries.id });

    return summary ? this.findById(summary.id) : null;
  }

  async update(
    id: string,
    input: {
      reviewDate: string;
      currentPhase: string;
      currentDesignation: string;
      rollup: QuarterlyKpiRollupRecord;
      assessment: QuarterlyKpiAssessmentRecord;
      actionPlan: QuarterlyKpiActionPlanRecord;
      outcome?: QuarterlyKpiOutcomeRecord;
      feedback?: string;
      actorId: string;
    },
  ) {
    const [summary] = await db
      .update(quarterlyKpiSummaries)
      .set({
        reviewDate: input.reviewDate,
        currentPhase: input.currentPhase,
        currentDesignation: input.currentDesignation,
        rollup: input.rollup,
        assessment: input.assessment,
        actionPlan: input.actionPlan,
        outcome: input.outcome,
        feedback: input.feedback,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(
        and(
          eq(quarterlyKpiSummaries.id, id),
          isNull(quarterlyKpiSummaries.deletedAt),
          eq(quarterlyKpiSummaries.status, "draft"),
        ),
      )
      .returning({ id: quarterlyKpiSummaries.id });

    return summary ? this.findById(summary.id) : null;
  }

  async complete(id: string, actorId: string) {
    const [summary] = await db
      .update(quarterlyKpiSummaries)
      .set({
        status: "approved",
        completedAt: new Date(),
        reviewedAt: new Date(),
        reviewedBy: actorId,
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .where(
        and(
          eq(quarterlyKpiSummaries.id, id),
          isNull(quarterlyKpiSummaries.deletedAt),
          eq(quarterlyKpiSummaries.status, "draft"),
        ),
      )
      .returning({ id: quarterlyKpiSummaries.id });

    return summary ? this.findById(summary.id) : null;
  }

  async audit(input: {
    actorType: ActorType;
    actorId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    await db.insert(auditLogs).values({
      actorType: input.actorType,
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValue: input.oldValue,
      newValue: input.newValue,
      metadata: input.metadata ?? {},
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
  }

  async emitDomainEvent(input: {
    eventName: string;
    entityType: string;
    entityId: string;
    actorType: ActorType;
    actorId?: string;
    payload?: Record<string, unknown>;
  }) {
    await db.insert(domainEvents).values({
      eventName: input.eventName,
      entityType: input.entityType,
      entityId: input.entityId,
      actorType: input.actorType,
      actorId: input.actorId,
      payload: input.payload ?? {},
    });
  }

  private listQuarterMonths(reviewYear: number, reviewQuarter: number) {
    const startMonth = (reviewQuarter - 1) * 3 + 1;

    return Array.from({ length: 3 }, (_, index) => {
      const month = String(startMonth + index).padStart(2, "0");
      return `${reviewYear}-${month}`;
    });
  }

  private async baseQuery(
    conditions: SQL[],
    limit?: number,
  ): Promise<QuarterlyKpiSummaryRecord[]> {
    const query = db
      .select(quarterlySummarySelect)
      .from(quarterlyKpiSummaries)
      .innerJoin(candidates, eq(candidates.id, quarterlyKpiSummaries.candidateId))
      .innerJoin(users, eq(users.id, candidates.userId))
      .innerJoin(reviewerUsers, eq(reviewerUsers.id, quarterlyKpiSummaries.reviewerId))
      .innerJoin(programs, eq(programs.id, candidates.programId))
      .leftJoin(batches, eq(batches.id, candidates.batchId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(
        desc(quarterlyKpiSummaries.reviewYear),
        desc(quarterlyKpiSummaries.reviewQuarter),
        desc(quarterlyKpiSummaries.createdAt),
      );

    const rows = limit ? await query.limit(limit) : await query;

    return rows.map((row) => ({
      ...row,
      reviewDate: row.reviewDate ?? null,
      reviewPeriodStart: row.reviewPeriodStart,
      reviewPeriodEnd: row.reviewPeriodEnd,
      rollup:
        row.rollup && typeof row.rollup === "object"
          ? ({
              ...emptyRollup,
              ...(row.rollup as QuarterlyKpiRollupRecord),
              workflowSummaries: {
                ...emptyWorkflowSummaries,
                ...((row.rollup as QuarterlyKpiRollupRecord).workflowSummaries ?? {}),
              },
              linkedMonthlyKpiReviews:
                (row.rollup as QuarterlyKpiRollupRecord).linkedMonthlyKpiReviews ?? [],
            } as QuarterlyKpiRollupRecord)
          : emptyRollup,
      assessment:
        row.assessment && typeof row.assessment === "object"
          ? (row.assessment as QuarterlyKpiAssessmentRecord)
          : emptyAssessment,
      actionPlan:
        row.actionPlan && typeof row.actionPlan === "object"
          ? (row.actionPlan as QuarterlyKpiActionPlanRecord)
          : emptyActionPlan,
      outcome:
        row.outcome && quarterlyOutcomeValues.has(row.outcome as QuarterlyKpiOutcomeRecord)
          ? (row.outcome as QuarterlyKpiOutcomeRecord)
          : null,
    }));
  }

  private async buildScopeConditions(role: Role, actorId: string) {
    const conditions = await this.buildCandidateScopeConditions(role, actorId);
    conditions.push(isNull(candidates.deletedAt));

    if (role === "Candidate") {
      conditions.push(eq(quarterlyKpiSummaries.status, "approved"));
    }

    return conditions;
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
