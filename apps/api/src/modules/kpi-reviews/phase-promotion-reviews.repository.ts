import {
  auditLogs,
  batchAssignments,
  batches,
  candidateLogs,
  calls,
  candidates,
  db,
  domainEvents,
  kpiReviews,
  phasePromotionReviews,
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

const preparedByUsers = alias(users, "phase_promotion_prepared_by_users");

export type PhasePromotionChecklistItemRecord = {
  criterionKey: string;
  criterionLabel: string;
  isMet: boolean;
  evidence: string | null;
};

export type PhasePromotionEvidenceMonthlyAverageRecord = {
  kpiReviewId: string | null;
  reviewPeriod: string;
  overallScore: number;
};

export type PhasePromotionHoursComplianceTrendRecord = {
  reviewPeriod: string;
  monthlyTargetHours: number;
  actualHoursLogged: number;
  complianceStatus: string;
};

export type PhasePromotionTaskTrendRecord = {
  reviewPeriod: string;
  approvedCount: number;
  revisionCount: number;
  totalCount: number;
};

export type PhasePromotionRelatedQuarterlySummaryRecord = {
  id: string;
  reviewYear: number;
  reviewQuarter: number;
  quarterlyAverageScore: number | null;
  status: string;
};

export type PhasePromotionEvidenceRecord = {
  recentMonthlyKpiAverages: PhasePromotionEvidenceMonthlyAverageRecord[];
  overallRecentAverage: number | null;
  hoursComplianceSummary: string | null;
  hoursComplianceTrend: PhasePromotionHoursComplianceTrendRecord[];
  taskCompletionSummary: string | null;
  taskApprovalTrend: PhasePromotionTaskTrendRecord[];
  relatedQuarterlySummary: PhasePromotionRelatedQuarterlySummaryRecord | null;
  qualityReworkSummary: string | null;
  leadReviewSummary: string | null;
  keyProjectsCompleted: string[];
  skillsDemonstrated: string[];
  independentDeliveryEvidence: string | null;
  mentoringLeadershipSignals: string | null;
  repositoryLinks: string[];
  supportingFileIds: string[];
};

export type PhasePromotionLeadRecommendationRecord = {
  recommendation: "promote" | "promote_with_conditions" | "hold";
  summary: string | null;
  conditions: string | null;
  initialAssignmentNextPhase: string | null;
};

export type PhasePromotionProgramAdminReviewRecord = {
  decision: "recommend_approval" | "recommend_rejection" | "revision_required" | null;
  note: string | null;
};

export type PhasePromotionSuperAdminDecisionRecord = {
  decision: "approved" | "rejected" | "revision_required" | null;
  note: string | null;
};

export type PhasePromotionReviewRecord = {
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
  preparedBy: string;
  preparedByName: string;
  preparedDate: string;
  currentPhase: string;
  currentDesignation: string;
  proposedNextPhase: string;
  proposedNextDesignation: string;
  currentMonthlyFee: number | null;
  proposedMonthlyFee: number | null;
  currentPhaseStartDate: string | null;
  monthsInCurrentPhase: number | null;
  promotionEffectiveDate: string;
  promotionCycleType: string;
  caseType: "normal_eligibility" | "exception_case";
  exceptionReason: string | null;
  evidence: PhasePromotionEvidenceRecord;
  eligibilityChecklist: PhasePromotionChecklistItemRecord[];
  leadRecommendation: PhasePromotionLeadRecommendationRecord;
  programAdminReview: PhasePromotionProgramAdminReviewRecord;
  superAdminDecision: PhasePromotionSuperAdminDecisionRecord;
  candidateAcknowledgedAt: Date | null;
  candidateAcknowledgedBy: string | null;
  status: WorkflowStatus;
  submittedAt: Date | null;
  programAdminReviewedAt: Date | null;
  programAdminReviewedBy: string | null;
  superAdminReviewedAt: Date | null;
  superAdminReviewedBy: string | null;
  reviewNote: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

const phasePromotionSelect = {
  id: phasePromotionReviews.id,
  candidateId: phasePromotionReviews.candidateId,
  userId: candidates.userId,
  fullName: users.fullName,
  email: users.email,
  candidateCode: candidates.candidateCode,
  programId: candidates.programId,
  programName: programs.name,
  batchId: candidates.batchId,
  batchName: batches.name,
  preparedBy: phasePromotionReviews.preparedBy,
  preparedByName: preparedByUsers.fullName,
  preparedDate: phasePromotionReviews.preparedDate,
  currentPhase: phasePromotionReviews.currentPhase,
  currentDesignation: phasePromotionReviews.currentDesignation,
  proposedNextPhase: phasePromotionReviews.proposedNextPhase,
  proposedNextDesignation: phasePromotionReviews.proposedNextDesignation,
  currentMonthlyFee: phasePromotionReviews.currentMonthlyFee,
  proposedMonthlyFee: phasePromotionReviews.proposedMonthlyFee,
  currentPhaseStartDate: phasePromotionReviews.currentPhaseStartDate,
  monthsInCurrentPhase: phasePromotionReviews.monthsInCurrentPhase,
  promotionEffectiveDate: phasePromotionReviews.promotionEffectiveDate,
  promotionCycleType: phasePromotionReviews.promotionCycleType,
  caseType: phasePromotionReviews.caseType,
  exceptionReason: phasePromotionReviews.exceptionReason,
  evidence: phasePromotionReviews.evidence,
  eligibilityChecklist: phasePromotionReviews.eligibilityChecklist,
  leadRecommendation: phasePromotionReviews.leadRecommendation,
  programAdminReview: phasePromotionReviews.programAdminReview,
  superAdminDecision: phasePromotionReviews.superAdminDecision,
  candidateAcknowledgedAt: phasePromotionReviews.candidateAcknowledgedAt,
  candidateAcknowledgedBy: phasePromotionReviews.candidateAcknowledgedBy,
  status: phasePromotionReviews.status,
  submittedAt: phasePromotionReviews.submittedAt,
  programAdminReviewedAt: phasePromotionReviews.programAdminReviewedAt,
  programAdminReviewedBy: phasePromotionReviews.programAdminReviewedBy,
  superAdminReviewedAt: phasePromotionReviews.superAdminReviewedAt,
  superAdminReviewedBy: phasePromotionReviews.superAdminReviewedBy,
  reviewNote: phasePromotionReviews.reviewNote,
  isActive: phasePromotionReviews.isActive,
  createdAt: phasePromotionReviews.createdAt,
  updatedAt: phasePromotionReviews.updatedAt,
  deletedAt: phasePromotionReviews.deletedAt,
};

const emptyEvidence: PhasePromotionEvidenceRecord = {
  recentMonthlyKpiAverages: [],
  overallRecentAverage: null,
  hoursComplianceSummary: null,
  hoursComplianceTrend: [],
  taskCompletionSummary: null,
  taskApprovalTrend: [],
  relatedQuarterlySummary: null,
  qualityReworkSummary: null,
  leadReviewSummary: null,
  keyProjectsCompleted: [],
  skillsDemonstrated: [],
  independentDeliveryEvidence: null,
  mentoringLeadershipSignals: null,
  repositoryLinks: [],
  supportingFileIds: [],
};

const emptyProgramAdminReview: PhasePromotionProgramAdminReviewRecord = {
  decision: null,
  note: null,
};

const emptySuperAdminDecision: PhasePromotionSuperAdminDecisionRecord = {
  decision: null,
  note: null,
};

const phasePromotionCaseTypes = new Set<PhasePromotionReviewRecord["caseType"]>([
  "normal_eligibility",
  "exception_case",
]);

export class PhasePromotionReviewsRepository {
  async list(input: {
    role: Role;
    actorId: string;
    programId?: string;
    batchId?: string;
    candidateId?: string;
    status?: WorkflowStatus;
    caseType?: "normal_eligibility" | "exception_case";
    includeArchived?: boolean;
  }) {
    const conditions = await this.buildScopeConditions(input.role, input.actorId);

    if (!input.includeArchived) {
      conditions.push(isNull(phasePromotionReviews.deletedAt));
    }

    if (input.programId) {
      conditions.push(eq(candidates.programId, input.programId));
    }

    if (input.batchId) {
      conditions.push(eq(candidates.batchId, input.batchId));
    }

    if (input.candidateId) {
      conditions.push(eq(phasePromotionReviews.candidateId, input.candidateId));
    }

    if (input.status) {
      conditions.push(eq(phasePromotionReviews.status, input.status));
    }

    if (input.caseType) {
      conditions.push(eq(phasePromotionReviews.caseType, input.caseType));
    }

    return this.baseQuery(conditions);
  }

  async findById(id: string, includeArchived = false) {
    const conditions: SQL[] = [eq(phasePromotionReviews.id, id)];

    if (!includeArchived) {
      conditions.push(isNull(phasePromotionReviews.deletedAt));
    }

    const [review] = await this.baseQuery(conditions, 1);
    return review ?? null;
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

  async canAccessPhasePromotionReview(input: {
    reviewId: string;
    role: Role;
    actorId: string;
    includeArchived?: boolean;
  }) {
    const conditions = await this.buildScopeConditions(input.role, input.actorId);
    conditions.push(eq(phasePromotionReviews.id, input.reviewId));

    if (!input.includeArchived) {
      conditions.push(isNull(phasePromotionReviews.deletedAt));
    }

    const [review] = await db
      .select({ id: phasePromotionReviews.id })
      .from(phasePromotionReviews)
      .innerJoin(candidates, eq(candidates.id, phasePromotionReviews.candidateId))
      .where(and(...conditions))
      .limit(1);

    return Boolean(review);
  }

  async create(input: {
    candidateId: string;
    preparedBy: string;
    preparedDate: string;
    currentPhase: string;
    currentDesignation: string;
    proposedNextPhase: string;
    proposedNextDesignation: string;
    currentMonthlyFee?: number | null;
    proposedMonthlyFee?: number | null;
    currentPhaseStartDate?: string | null;
    monthsInCurrentPhase?: number | null;
    promotionEffectiveDate: string;
    promotionCycleType: string;
    caseType: "normal_eligibility" | "exception_case";
    exceptionReason?: string | null;
    evidence: PhasePromotionEvidenceRecord;
    eligibilityChecklist: PhasePromotionChecklistItemRecord[];
    leadRecommendation: PhasePromotionLeadRecommendationRecord;
  }) {
    const [review] = await db
      .insert(phasePromotionReviews)
      .values({
        candidateId: input.candidateId,
        preparedBy: input.preparedBy,
        preparedDate: input.preparedDate,
        currentPhase: input.currentPhase,
        currentDesignation: input.currentDesignation,
        proposedNextPhase: input.proposedNextPhase,
        proposedNextDesignation: input.proposedNextDesignation,
        currentMonthlyFee: input.currentMonthlyFee ?? null,
        proposedMonthlyFee: input.proposedMonthlyFee ?? null,
        currentPhaseStartDate: input.currentPhaseStartDate ?? null,
        monthsInCurrentPhase: input.monthsInCurrentPhase ?? null,
        promotionEffectiveDate: input.promotionEffectiveDate,
        promotionCycleType: input.promotionCycleType,
        caseType: input.caseType,
        exceptionReason: input.exceptionReason ?? null,
        evidence: input.evidence,
        eligibilityChecklist: input.eligibilityChecklist,
        leadRecommendation: input.leadRecommendation,
      })
      .returning({ id: phasePromotionReviews.id });

    return review ? this.findById(review.id) : null;
  }

  async update(
    id: string,
    input: {
      preparedDate: string;
      currentPhase: string;
      currentDesignation: string;
      proposedNextPhase: string;
      proposedNextDesignation: string;
      currentMonthlyFee?: number | null;
      proposedMonthlyFee?: number | null;
      currentPhaseStartDate?: string | null;
      monthsInCurrentPhase?: number | null;
      promotionEffectiveDate: string;
      promotionCycleType: string;
      caseType: "normal_eligibility" | "exception_case";
      exceptionReason?: string | null;
      evidence: PhasePromotionEvidenceRecord;
      eligibilityChecklist: PhasePromotionChecklistItemRecord[];
      leadRecommendation: PhasePromotionLeadRecommendationRecord;
      actorId: string;
    },
  ) {
    const [review] = await db
      .update(phasePromotionReviews)
      .set({
        preparedDate: input.preparedDate,
        currentPhase: input.currentPhase,
        currentDesignation: input.currentDesignation,
        proposedNextPhase: input.proposedNextPhase,
        proposedNextDesignation: input.proposedNextDesignation,
        currentMonthlyFee: input.currentMonthlyFee ?? null,
        proposedMonthlyFee: input.proposedMonthlyFee ?? null,
        currentPhaseStartDate: input.currentPhaseStartDate ?? null,
        monthsInCurrentPhase: input.monthsInCurrentPhase ?? null,
        promotionEffectiveDate: input.promotionEffectiveDate,
        promotionCycleType: input.promotionCycleType,
        caseType: input.caseType,
        exceptionReason: input.exceptionReason ?? null,
        evidence: input.evidence,
        eligibilityChecklist: input.eligibilityChecklist,
        leadRecommendation: input.leadRecommendation,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(eq(phasePromotionReviews.id, id))
      .returning({ id: phasePromotionReviews.id });

    return review ? this.findById(review.id) : null;
  }

  async submit(id: string, actorId: string) {
    const [review] = await db
      .update(phasePromotionReviews)
      .set({
        status: "submitted",
        submittedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .where(eq(phasePromotionReviews.id, id))
      .returning({ id: phasePromotionReviews.id });

    return review ? this.findById(review.id) : null;
  }

  async reviewByProgramAdmin(
    id: string,
    input: {
      decision: "recommend_approval" | "recommend_rejection" | "revision_required";
      note: string;
      actorId: string;
    },
  ) {
    const [review] = await db
      .update(phasePromotionReviews)
      .set({
        programAdminReview: {
          decision: input.decision,
          note: input.note,
        },
        status: input.decision === "revision_required" ? "revision_required" : "under_review",
        programAdminReviewedAt: new Date(),
        programAdminReviewedBy: input.actorId,
        reviewNote: input.note,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(eq(phasePromotionReviews.id, id))
      .returning({ id: phasePromotionReviews.id });

    return review ? this.findById(review.id) : null;
  }

  async decideBySuperAdmin(
    id: string,
    input: {
      decision: "approved" | "rejected" | "revision_required";
      note: string;
      actorId: string;
    },
  ) {
    const [review] = await db
      .update(phasePromotionReviews)
      .set({
        superAdminDecision: {
          decision: input.decision,
          note: input.note,
        },
        status: input.decision,
        superAdminReviewedAt: new Date(),
        superAdminReviewedBy: input.actorId,
        reviewNote: input.note,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(eq(phasePromotionReviews.id, id))
      .returning({ id: phasePromotionReviews.id });

    return review ? this.findById(review.id) : null;
  }

  async acknowledge(id: string, actorId: string) {
    const [review] = await db
      .update(phasePromotionReviews)
      .set({
        candidateAcknowledgedAt: new Date(),
        candidateAcknowledgedBy: actorId,
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .where(eq(phasePromotionReviews.id, id))
      .returning({ id: phasePromotionReviews.id });

    return review ? this.findById(review.id) : null;
  }

  async applyApprovedPromotion(input: {
    candidateId: string;
    currentPhase: string;
    currentDesignation: string;
    currentMonthlyFee?: number | null;
    currentPhaseStartDate: string;
    actorId: string;
  }) {
    await db
      .update(candidates)
      .set({
        currentPhase: input.currentPhase,
        currentDesignation: input.currentDesignation,
        currentMonthlyFee: input.currentMonthlyFee ?? null,
        currentPhaseStartDate: input.currentPhaseStartDate,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(eq(candidates.id, input.candidateId));
  }

  async buildEvidence(input: {
    candidateId: string;
    qualityReworkSummary?: string;
    leadReviewSummary?: string;
    keyProjectsCompleted: string[];
    skillsDemonstrated: string[];
    independentDeliveryEvidence?: string;
    mentoringLeadershipSignals?: string;
    repositoryLinks: string[];
    supportingFileIds: string[];
  }): Promise<PhasePromotionEvidenceRecord> {
    const monthlyRows = await db
      .select({
        id: kpiReviews.id,
        reviewPeriod: kpiReviews.reviewPeriod,
        overallScore: kpiReviews.overallScore,
        attendanceSummary: kpiReviews.attendanceSummary,
      })
      .from(kpiReviews)
      .where(
        and(
          eq(kpiReviews.candidateId, input.candidateId),
          eq(kpiReviews.status, "approved"),
          isNull(kpiReviews.deletedAt),
        ),
      )
      .orderBy(desc(kpiReviews.reviewPeriod))
      .limit(3);

    const recentMonthlyKpiAverages = monthlyRows
      .filter((row) => row.overallScore !== null)
      .map((row) => ({
        kpiReviewId: row.id,
        reviewPeriod: row.reviewPeriod,
        overallScore: row.overallScore ?? 0,
      }));

    const overallRecentAverage =
      recentMonthlyKpiAverages.length > 0
        ? Number(
            (
              recentMonthlyKpiAverages.reduce((sum, row) => sum + row.overallScore, 0) /
              recentMonthlyKpiAverages.length
            ).toFixed(2),
          )
        : null;

    const hoursComplianceTrend = monthlyRows.map((row) => {
      const attendance =
        row.attendanceSummary && typeof row.attendanceSummary === "object"
          ? (row.attendanceSummary as {
              monthlyTargetHours?: number;
              actualHoursLogged?: number;
              complianceStatus?: string;
            })
          : {};

      return {
        reviewPeriod: row.reviewPeriod,
        monthlyTargetHours: attendance.monthlyTargetHours ?? 0,
        actualHoursLogged: attendance.actualHoursLogged ?? 0,
        complianceStatus: attendance.complianceStatus ?? "unknown",
      };
    });

    const reviewPeriods = monthlyRows.map((row) => row.reviewPeriod);
    const taskApprovalTrend: PhasePromotionTaskTrendRecord[] = [];

    for (const reviewPeriod of reviewPeriods) {
      const [yearText, monthText] = reviewPeriod.split("-");
      const year = Number(yearText);
      const month = Number(monthText);
      const periodStart = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
      const periodEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

      const taskRows = await db
        .select({ status: taskBriefs.status })
        .from(taskBriefs)
        .where(
          and(
            eq(taskBriefs.candidateId, input.candidateId),
            gte(
              sql<string>`coalesce(${taskBriefs.submittedAt}::date, ${taskBriefs.createdAt}::date)`,
              periodStart,
            ),
            lte(
              sql<string>`coalesce(${taskBriefs.submittedAt}::date, ${taskBriefs.createdAt}::date)`,
              periodEnd,
            ),
            isNull(taskBriefs.deletedAt),
          ),
        );

      taskApprovalTrend.push({
        reviewPeriod,
        approvedCount: taskRows.filter((row) => row.status === "approved").length,
        revisionCount: taskRows.filter((row) => row.status === "revision_required").length,
        totalCount: taskRows.length,
      });
    }

    const [timesheetSummary] = await db
      .select({
        approvedCount: sql<number>`count(*) filter (where ${timesheets.status} = 'approved')`,
        totalHours: sql<number>`coalesce(sum(${timesheets.totalMinutes}), 0) / 60.0`,
      })
      .from(timesheets)
      .where(and(eq(timesheets.candidateId, input.candidateId), isNull(timesheets.deletedAt)));

    const [taskSummary] = await db
      .select({
        approvedCount: sql<number>`count(*) filter (where ${taskBriefs.status} = 'approved')`,
        revisionCount: sql<number>`count(*) filter (where ${taskBriefs.status} = 'revision_required')`,
        totalCount: sql<number>`count(*)`,
      })
      .from(taskBriefs)
      .where(and(eq(taskBriefs.candidateId, input.candidateId), isNull(taskBriefs.deletedAt)));

    const [relatedQuarterly] = await db
      .select({
        id: quarterlyKpiSummaries.id,
        reviewYear: quarterlyKpiSummaries.reviewYear,
        reviewQuarter: quarterlyKpiSummaries.reviewQuarter,
        status: quarterlyKpiSummaries.status,
        rollup: quarterlyKpiSummaries.rollup,
      })
      .from(quarterlyKpiSummaries)
      .where(
        and(
          eq(quarterlyKpiSummaries.candidateId, input.candidateId),
          eq(quarterlyKpiSummaries.status, "approved"),
          isNull(quarterlyKpiSummaries.deletedAt),
        ),
      )
      .orderBy(
        desc(quarterlyKpiSummaries.reviewYear),
        desc(quarterlyKpiSummaries.reviewQuarter),
      )
      .limit(1);

    const relatedQuarterlySummary = relatedQuarterly
      ? {
          id: relatedQuarterly.id,
          reviewYear: relatedQuarterly.reviewYear,
          reviewQuarter: relatedQuarterly.reviewQuarter,
          status: relatedQuarterly.status,
          quarterlyAverageScore:
            relatedQuarterly.rollup &&
            typeof relatedQuarterly.rollup === "object" &&
            "quarterlyAverageScore" in relatedQuarterly.rollup
              ? ((relatedQuarterly.rollup as { quarterlyAverageScore?: number | null })
                  .quarterlyAverageScore ?? null)
              : null,
        }
      : null;

    const complianceTrendSummary =
      hoursComplianceTrend.length > 0
        ? hoursComplianceTrend
            .map(
              (entry) =>
                `${entry.reviewPeriod}: ${entry.actualHoursLogged}/${entry.monthlyTargetHours}h (${entry.complianceStatus.replaceAll("_", " ")})`,
            )
            .join("; ")
        : null;

    const [recentLogCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(candidateLogs)
      .where(and(eq(candidateLogs.candidateId, input.candidateId), isNull(candidateLogs.deletedAt)));

    const [recentCallCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(calls)
      .where(and(eq(calls.candidateId, input.candidateId), isNull(calls.deletedAt)));

    return {
      recentMonthlyKpiAverages,
      overallRecentAverage,
      hoursComplianceSummary:
        complianceTrendSummary ??
        (timesheetSummary && Number(timesheetSummary.approvedCount) > 0
          ? `${Number(timesheetSummary.approvedCount)} approved timesheets with ${Number(timesheetSummary.totalHours).toFixed(1)} total logged hours.`
          : "No approved timesheet history available."),
      hoursComplianceTrend,
      taskCompletionSummary:
        taskSummary && Number(taskSummary.totalCount) > 0
          ? `${Number(taskSummary.approvedCount)} approved tasks, ${Number(taskSummary.revisionCount)} tasks sent for revision out of ${Number(taskSummary.totalCount)} total tasks. Linked activity: ${Number(recentLogCount?.count ?? 0)} daily logs and ${Number(recentCallCount?.count ?? 0)} calls on record.`
          : `No task history available. Linked activity: ${Number(recentLogCount?.count ?? 0)} daily logs and ${Number(recentCallCount?.count ?? 0)} calls on record.`,
      taskApprovalTrend,
      relatedQuarterlySummary,
      qualityReworkSummary: input.qualityReworkSummary ?? null,
      leadReviewSummary: input.leadReviewSummary ?? null,
      keyProjectsCompleted: input.keyProjectsCompleted,
      skillsDemonstrated: input.skillsDemonstrated,
      independentDeliveryEvidence: input.independentDeliveryEvidence ?? null,
      mentoringLeadershipSignals: input.mentoringLeadershipSignals ?? null,
      repositoryLinks: input.repositoryLinks,
      supportingFileIds: input.supportingFileIds,
    };
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

  private async baseQuery(
    conditions: SQL[],
    limit?: number,
  ): Promise<PhasePromotionReviewRecord[]> {
    const query = db
      .select(phasePromotionSelect)
      .from(phasePromotionReviews)
      .innerJoin(candidates, eq(candidates.id, phasePromotionReviews.candidateId))
      .innerJoin(users, eq(users.id, candidates.userId))
      .innerJoin(preparedByUsers, eq(preparedByUsers.id, phasePromotionReviews.preparedBy))
      .innerJoin(programs, eq(programs.id, candidates.programId))
      .leftJoin(batches, eq(batches.id, candidates.batchId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(phasePromotionReviews.createdAt));

    const rows = limit ? await query.limit(limit) : await query;

    return rows.map((row) => ({
      ...row,
      preparedDate: row.preparedDate,
      currentPhaseStartDate: row.currentPhaseStartDate ?? null,
      promotionEffectiveDate: row.promotionEffectiveDate,
      caseType: phasePromotionCaseTypes.has(row.caseType as PhasePromotionReviewRecord["caseType"])
        ? (row.caseType as PhasePromotionReviewRecord["caseType"])
        : "normal_eligibility",
      evidence:
        row.evidence && typeof row.evidence === "object"
          ? ({ ...emptyEvidence, ...row.evidence } as PhasePromotionEvidenceRecord)
          : emptyEvidence,
      eligibilityChecklist: Array.isArray(row.eligibilityChecklist)
        ? (row.eligibilityChecklist as PhasePromotionChecklistItemRecord[]).map((item) => ({
            ...item,
            evidence: item.evidence ?? null,
          }))
        : [],
      leadRecommendation:
        row.leadRecommendation && typeof row.leadRecommendation === "object"
          ? ({
              recommendation: "hold",
              summary: null,
              conditions: null,
              initialAssignmentNextPhase: null,
              ...row.leadRecommendation,
            } as PhasePromotionLeadRecommendationRecord)
          : {
              recommendation: "hold",
              summary: null,
              conditions: null,
              initialAssignmentNextPhase: null,
            },
      programAdminReview:
        row.programAdminReview && typeof row.programAdminReview === "object"
          ? ({ ...emptyProgramAdminReview, ...row.programAdminReview } as PhasePromotionProgramAdminReviewRecord)
          : emptyProgramAdminReview,
      superAdminDecision:
        row.superAdminDecision && typeof row.superAdminDecision === "object"
          ? ({ ...emptySuperAdminDecision, ...row.superAdminDecision } as PhasePromotionSuperAdminDecisionRecord)
          : emptySuperAdminDecision,
    }));
  }

  private async buildScopeConditions(role: Role, actorId: string) {
    const conditions = await this.buildCandidateScopeConditions(role, actorId);
    conditions.push(isNull(candidates.deletedAt));

    if (role === "Candidate") {
      conditions.push(inArray(phasePromotionReviews.status, ["approved", "rejected"]));
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
