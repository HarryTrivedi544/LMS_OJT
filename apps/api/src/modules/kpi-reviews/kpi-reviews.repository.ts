import {
  auditLogs,
  batchAssignments,
  batches,
  candidates,
  db,
  domainEvents,
  kpiReviews,
  programAssignments,
  programs,
  users,
} from "@lms/db";
import type { ActorType, Role, WorkflowStatus } from "@lms/shared";
import { and, desc, eq, inArray, isNull, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const reviewerUsers = alias(users, "reviewer_users");

export type KpiScoreEntryRecord = {
  key: string;
  criterion: string;
  score: number;
  maxScore: number;
  notes?: string;
};

export type KpiAttendanceSummaryRecord = {
  monthlyTargetHours: number;
  actualHoursLogged: number;
  workingDaysAvailable: number | null;
  daysAbsent: number;
  publicHolidays: number;
  nonAvailabilityDays: number;
  complianceStatus: "full_compliance" | "partial" | "non_compliant";
  varianceHours: number;
};

export type KpiReviewSummaryRecord = {
  overallRating: "excellent" | "good" | "satisfactory" | "below_standard";
  topStrengths: string[];
  improvementAreas: string[];
  notableAchievements: string | null;
  qualityIssues: string | null;
  feedbackResponse: string | null;
  conductConcerns: string | null;
};

export type KpiImprovementDirectiveRecord = {
  criterionKey: string;
  criterionLabel: string;
  directive: string;
  measurementDeadline: string;
};

export type KpiImprovementPlanRecord = {
  improvementRequired: boolean;
  directives: KpiImprovementDirectiveRecord[];
  pipConsideration: boolean;
  nextReviewDate: string | null;
};

export type KpiPromotionSignalRecord = {
  promotionWatch: boolean;
  readyForPromotion: boolean;
};

export type KpiFeeRecommendationRecord = {
  decision: "maintain" | "increment" | "hold";
  incrementAmount: number | null;
  justification: string | null;
};

export type KpiReviewRecord = {
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
  reviewPeriod: string;
  reviewDate: string | null;
  currentPhase: string | null;
  currentDesignation: string | null;
  programStartDate: string | null;
  monthsInCurrentPhase: number | null;
  attendanceSummary: KpiAttendanceSummaryRecord;
  scores: KpiScoreEntryRecord[];
  overallScore: number | null;
  summary: KpiReviewSummaryRecord;
  improvementPlan: KpiImprovementPlanRecord;
  promotionSignal: KpiPromotionSignalRecord;
  feeRecommendation: KpiFeeRecommendationRecord | null;
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

const kpiReviewSelect = {
  id: kpiReviews.id,
  candidateId: kpiReviews.candidateId,
  userId: candidates.userId,
  fullName: users.fullName,
  email: users.email,
  candidateCode: candidates.candidateCode,
  programId: candidates.programId,
  programName: programs.name,
  batchId: candidates.batchId,
  batchName: batches.name,
  reviewerId: kpiReviews.reviewerId,
  reviewerName: reviewerUsers.fullName,
  reviewPeriod: kpiReviews.reviewPeriod,
  reviewDate: kpiReviews.reviewDate,
  currentPhase: kpiReviews.currentPhase,
  currentDesignation: kpiReviews.currentDesignation,
  programStartDate: kpiReviews.programStartDate,
  monthsInCurrentPhase: kpiReviews.monthsInCurrentPhase,
  attendanceSummary: kpiReviews.attendanceSummary,
  scores: kpiReviews.scores,
  overallScore: kpiReviews.overallScore,
  summary: kpiReviews.summary,
  improvementPlan: kpiReviews.improvementPlan,
  promotionSignal: kpiReviews.promotionSignal,
  feeRecommendation: kpiReviews.feeRecommendation,
  feedback: kpiReviews.feedback,
  status: kpiReviews.status,
  completedAt: kpiReviews.completedAt,
  reviewedAt: kpiReviews.reviewedAt,
  reviewedBy: kpiReviews.reviewedBy,
  reviewNote: kpiReviews.reviewNote,
  isActive: kpiReviews.isActive,
  createdAt: kpiReviews.createdAt,
  updatedAt: kpiReviews.updatedAt,
  deletedAt: kpiReviews.deletedAt,
};

export class KpiReviewsRepository {
  async list(input: {
    role: Role;
    actorId: string;
    programId?: string;
    batchId?: string;
    candidateId?: string;
    status?: WorkflowStatus;
    reviewPeriod?: string;
    includeArchived?: boolean;
  }) {
    const conditions = await this.buildKpiReviewScopeConditions(input.role, input.actorId);

    if (!input.includeArchived) {
      conditions.push(isNull(kpiReviews.deletedAt));
    }

    if (input.programId) {
      conditions.push(eq(candidates.programId, input.programId));
    }

    if (input.batchId) {
      conditions.push(eq(candidates.batchId, input.batchId));
    }

    if (input.candidateId) {
      conditions.push(eq(kpiReviews.candidateId, input.candidateId));
    }

    if (input.status) {
      conditions.push(eq(kpiReviews.status, input.status));
    }

    if (input.reviewPeriod) {
      conditions.push(eq(kpiReviews.reviewPeriod, input.reviewPeriod));
    }

    return this.baseQuery(conditions);
  }

  async findById(id: string, includeArchived = false) {
    const conditions: SQL[] = [eq(kpiReviews.id, id)];

    if (!includeArchived) {
      conditions.push(isNull(kpiReviews.deletedAt));
    }

    const [kpiReview] = await this.baseQuery(conditions, 1);

    return kpiReview ?? null;
  }

  async findByCandidateAndPeriod(candidateId: string, reviewPeriod: string) {
    const [kpiReview] = await this.baseQuery(
      [
        eq(kpiReviews.candidateId, candidateId),
        eq(kpiReviews.reviewPeriod, reviewPeriod),
        isNull(kpiReviews.deletedAt),
      ],
      1,
    );

    return kpiReview ?? null;
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

  async canAccessKpiReview(input: {
    kpiReviewId: string;
    role: Role;
    actorId: string;
    includeArchived?: boolean;
  }) {
    const conditions = await this.buildKpiReviewScopeConditions(input.role, input.actorId);
    conditions.push(eq(kpiReviews.id, input.kpiReviewId));

    if (!input.includeArchived) {
      conditions.push(isNull(kpiReviews.deletedAt));
    }

    const [kpiReview] = await db
      .select({ id: kpiReviews.id })
      .from(kpiReviews)
      .innerJoin(candidates, eq(candidates.id, kpiReviews.candidateId))
      .where(and(...conditions))
      .limit(1);

    return Boolean(kpiReview);
  }

  async create(input: {
    candidateId: string;
    reviewerId: string;
    reviewPeriod: string;
    reviewDate: string;
    currentPhase: string;
    currentDesignation: string;
    programStartDate?: string;
    monthsInCurrentPhase?: number;
    attendanceSummary: KpiAttendanceSummaryRecord;
    scores: KpiScoreEntryRecord[];
    overallScore: number;
    summary: KpiReviewSummaryRecord;
    improvementPlan: KpiImprovementPlanRecord;
    promotionSignal: KpiPromotionSignalRecord;
    feeRecommendation?: KpiFeeRecommendationRecord;
    feedback?: string;
  }) {
    const [kpiReview] = await db
      .insert(kpiReviews)
      .values({
        candidateId: input.candidateId,
        reviewerId: input.reviewerId,
        reviewPeriod: input.reviewPeriod,
        reviewDate: input.reviewDate,
        currentPhase: input.currentPhase,
        currentDesignation: input.currentDesignation,
        programStartDate: input.programStartDate,
        monthsInCurrentPhase: input.monthsInCurrentPhase,
        attendanceSummary: input.attendanceSummary,
        scores: input.scores,
        overallScore: input.overallScore,
        summary: input.summary,
        improvementPlan: input.improvementPlan,
        promotionSignal: input.promotionSignal,
        feeRecommendation: input.feeRecommendation,
        feedback: input.feedback,
        status: "draft",
        createdBy: input.reviewerId,
        updatedBy: input.reviewerId,
      })
      .returning({ id: kpiReviews.id });

    return kpiReview ? this.findById(kpiReview.id) : null;
  }

  async update(
    id: string,
    input: {
      scores: KpiScoreEntryRecord[];
      overallScore: number;
      reviewDate: string;
      currentPhase: string;
      currentDesignation: string;
      programStartDate?: string;
      monthsInCurrentPhase?: number;
      attendanceSummary: KpiAttendanceSummaryRecord;
      summary: KpiReviewSummaryRecord;
      improvementPlan: KpiImprovementPlanRecord;
      promotionSignal: KpiPromotionSignalRecord;
      feeRecommendation?: KpiFeeRecommendationRecord;
      feedback?: string;
      actorId: string;
    },
  ) {
    const [kpiReview] = await db
      .update(kpiReviews)
      .set({
        reviewDate: input.reviewDate,
        currentPhase: input.currentPhase,
        currentDesignation: input.currentDesignation,
        programStartDate: input.programStartDate,
        monthsInCurrentPhase: input.monthsInCurrentPhase,
        attendanceSummary: input.attendanceSummary,
        scores: input.scores,
        overallScore: input.overallScore,
        summary: input.summary,
        improvementPlan: input.improvementPlan,
        promotionSignal: input.promotionSignal,
        feeRecommendation: input.feeRecommendation,
        feedback: input.feedback,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(and(eq(kpiReviews.id, id), isNull(kpiReviews.deletedAt), eq(kpiReviews.status, "draft")))
      .returning({ id: kpiReviews.id });

    return kpiReview ? this.findById(kpiReview.id) : null;
  }

  async complete(id: string, actorId: string) {
    const [kpiReview] = await db
      .update(kpiReviews)
      .set({
        status: "approved",
        completedAt: new Date(),
        reviewedAt: new Date(),
        reviewedBy: actorId,
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .where(and(eq(kpiReviews.id, id), isNull(kpiReviews.deletedAt), eq(kpiReviews.status, "draft")))
      .returning({ id: kpiReviews.id });

    return kpiReview ? this.findById(kpiReview.id) : null;
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

  private async baseQuery(conditions: SQL[], limit?: number): Promise<KpiReviewRecord[]> {
    const query = db
      .select(kpiReviewSelect)
      .from(kpiReviews)
      .innerJoin(candidates, eq(candidates.id, kpiReviews.candidateId))
      .innerJoin(users, eq(users.id, candidates.userId))
      .innerJoin(reviewerUsers, eq(reviewerUsers.id, kpiReviews.reviewerId))
      .innerJoin(programs, eq(programs.id, candidates.programId))
      .leftJoin(batches, eq(batches.id, candidates.batchId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(kpiReviews.reviewPeriod), desc(kpiReviews.createdAt));

    const rows = limit ? await query.limit(limit) : await query;

    return rows.map((row) => ({
      ...row,
      reviewDate: row.reviewDate ?? null,
      programStartDate: row.programStartDate ?? null,
      attendanceSummary:
        row.attendanceSummary && typeof row.attendanceSummary === "object"
          ? (row.attendanceSummary as KpiAttendanceSummaryRecord)
          : {
              monthlyTargetHours: 160,
              actualHoursLogged: 0,
              workingDaysAvailable: null,
              daysAbsent: 0,
              publicHolidays: 0,
              nonAvailabilityDays: 0,
              complianceStatus: "non_compliant",
              varianceHours: -160,
            },
      scores: Array.isArray(row.scores) ? (row.scores as KpiScoreEntryRecord[]) : [],
      summary:
        row.summary && typeof row.summary === "object"
          ? (row.summary as KpiReviewSummaryRecord)
          : {
              overallRating: "below_standard",
              topStrengths: [],
              improvementAreas: [],
              notableAchievements: null,
              qualityIssues: null,
              feedbackResponse: null,
              conductConcerns: null,
            },
      improvementPlan:
        row.improvementPlan && typeof row.improvementPlan === "object"
          ? (row.improvementPlan as KpiImprovementPlanRecord)
          : {
              improvementRequired: false,
              directives: [],
              pipConsideration: false,
              nextReviewDate: null,
            },
      promotionSignal:
        row.promotionSignal && typeof row.promotionSignal === "object"
          ? (row.promotionSignal as KpiPromotionSignalRecord)
          : {
              promotionWatch: false,
              readyForPromotion: false,
            },
      feeRecommendation:
        row.feeRecommendation && typeof row.feeRecommendation === "object"
          ? (row.feeRecommendation as KpiFeeRecommendationRecord)
          : null,
    }));
  }

  private async buildKpiReviewScopeConditions(role: Role, actorId: string) {
    const conditions = await this.buildCandidateScopeConditions(role, actorId);
    conditions.push(isNull(candidates.deletedAt));

    if (role === "Candidate") {
      conditions.push(eq(kpiReviews.status, "approved"));
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
