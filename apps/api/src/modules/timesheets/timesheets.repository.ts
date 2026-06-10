import {
  auditLogs,
  batchAssignments,
  batches,
  candidates,
  db,
  domainEvents,
  programAssignments,
  programs,
  timesheets,
  users,
} from "@lms/db";
import type { ActorType, Role, WorkflowStatus } from "@lms/shared";
import { and, desc, eq, inArray, isNull, type SQL } from "drizzle-orm";

export type TimesheetEntryRecord = {
  workDate: string;
  dayLabel: string;
  hours: number;
  minutes: number;
  summary?: string;
  blockers?: string;
};

export type TimesheetRecord = {
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
  weekStartDate: string;
  weekEndDate: string;
  totalMinutes: number;
  entries: TimesheetEntryRecord[];
  status: WorkflowStatus;
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

const timesheetSelect = {
  id: timesheets.id,
  candidateId: timesheets.candidateId,
  userId: candidates.userId,
  fullName: users.fullName,
  email: users.email,
  candidateCode: candidates.candidateCode,
  programId: candidates.programId,
  programName: programs.name,
  batchId: candidates.batchId,
  batchName: batches.name,
  weekStartDate: timesheets.weekStartDate,
  weekEndDate: timesheets.weekEndDate,
  totalMinutes: timesheets.totalMinutes,
  entries: timesheets.entries,
  status: timesheets.status,
  submittedAt: timesheets.submittedAt,
  reviewedAt: timesheets.reviewedAt,
  reviewedBy: timesheets.reviewedBy,
  reviewNote: timesheets.reviewNote,
  isActive: timesheets.isActive,
  createdAt: timesheets.createdAt,
  updatedAt: timesheets.updatedAt,
  deletedAt: timesheets.deletedAt,
};

export class TimesheetsRepository {
  async list(input: {
    role: Role;
    actorId: string;
    programId?: string;
    batchId?: string;
    candidateId?: string;
    status?: WorkflowStatus;
    weekStartDate?: string;
    includeArchived?: boolean;
  }) {
    const conditions = await this.buildTimesheetScopeConditions(input.role, input.actorId);

    if (!input.includeArchived) {
      conditions.push(isNull(timesheets.deletedAt));
    }

    if (input.programId) {
      conditions.push(eq(candidates.programId, input.programId));
    }

    if (input.batchId) {
      conditions.push(eq(candidates.batchId, input.batchId));
    }

    if (input.candidateId) {
      conditions.push(eq(timesheets.candidateId, input.candidateId));
    }

    if (input.status) {
      conditions.push(eq(timesheets.status, input.status));
    }

    if (input.weekStartDate) {
      conditions.push(eq(timesheets.weekStartDate, input.weekStartDate));
    }

    return this.baseQuery(conditions);
  }

  async findById(id: string, includeArchived = false) {
    const conditions: SQL[] = [eq(timesheets.id, id)];

    if (!includeArchived) {
      conditions.push(isNull(timesheets.deletedAt));
    }

    const [timesheet] = await this.baseQuery(conditions, 1);

    return timesheet ?? null;
  }

  async findByCandidateAndWeek(candidateId: string, weekStartDate: string) {
    const [timesheet] = await this.baseQuery(
      [eq(timesheets.candidateId, candidateId), eq(timesheets.weekStartDate, weekStartDate)],
      1,
    );

    return timesheet ?? null;
  }

  async findCandidateByUserId(userId: string) {
    const [candidate] = await db
      .select({
        id: candidates.id,
        userId: candidates.userId,
        status: candidates.status,
        deletedAt: candidates.deletedAt,
      })
      .from(candidates)
      .where(and(eq(candidates.userId, userId), isNull(candidates.deletedAt)))
      .limit(1);

    return candidate ?? null;
  }

  async canAccessTimesheet(input: {
    timesheetId: string;
    role: Role;
    actorId: string;
    includeArchived?: boolean;
  }) {
    const conditions = await this.buildTimesheetScopeConditions(input.role, input.actorId);
    conditions.push(eq(timesheets.id, input.timesheetId));

    if (!input.includeArchived) {
      conditions.push(isNull(timesheets.deletedAt));
    }

    const [timesheet] = await db
      .select({ id: timesheets.id })
      .from(timesheets)
      .innerJoin(candidates, eq(candidates.id, timesheets.candidateId))
      .where(and(...conditions))
      .limit(1);

    return Boolean(timesheet);
  }

  async create(input: {
    candidateId: string;
    weekStartDate: string;
    weekEndDate: string;
    totalMinutes: number;
    entries: TimesheetEntryRecord[];
    actorId: string;
  }) {
    const [timesheet] = await db
      .insert(timesheets)
      .values({
        candidateId: input.candidateId,
        weekStartDate: input.weekStartDate,
        weekEndDate: input.weekEndDate,
        totalMinutes: input.totalMinutes,
        entries: input.entries,
        status: "submitted",
        createdBy: input.actorId,
        updatedBy: input.actorId,
      })
      .returning({ id: timesheets.id });

    return timesheet ? this.findById(timesheet.id) : null;
  }

  async review(
    id: string,
    input: {
      status: "under_review" | "approved" | "rejected" | "revision_required";
      reviewNote?: string;
      actorId: string;
    },
  ) {
    const [timesheet] = await db
      .update(timesheets)
      .set({
        status: input.status,
        reviewNote: input.reviewNote,
        reviewedAt: new Date(),
        reviewedBy: input.actorId,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(and(eq(timesheets.id, id), isNull(timesheets.deletedAt)))
      .returning({ id: timesheets.id });

    return timesheet ? this.findById(timesheet.id) : null;
  }

  async resubmit(
    id: string,
    input: {
      totalMinutes: number;
      entries: TimesheetEntryRecord[];
      actorId: string;
    },
  ) {
    const [timesheet] = await db
      .update(timesheets)
      .set({
        totalMinutes: input.totalMinutes,
        entries: input.entries,
        status: "submitted",
        reviewedAt: null,
        reviewedBy: null,
        reviewNote: null,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(and(eq(timesheets.id, id), isNull(timesheets.deletedAt)))
      .returning({ id: timesheets.id });

    return timesheet ? this.findById(timesheet.id) : null;
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

  private async baseQuery(conditions: SQL[], limit?: number): Promise<TimesheetRecord[]> {
    const query = db
      .select(timesheetSelect)
      .from(timesheets)
      .innerJoin(candidates, eq(candidates.id, timesheets.candidateId))
      .innerJoin(users, eq(users.id, candidates.userId))
      .innerJoin(programs, eq(programs.id, candidates.programId))
      .leftJoin(batches, eq(batches.id, candidates.batchId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(timesheets.weekStartDate), desc(timesheets.createdAt));

    const rows = limit ? await query.limit(limit) : await query;

    return rows.map((row) => ({
      ...row,
      entries: Array.isArray(row.entries) ? (row.entries as TimesheetEntryRecord[]) : [],
    }));
  }

  private async buildTimesheetScopeConditions(role: Role, actorId: string) {
    const conditions = await this.buildCandidateScopeConditions(role, actorId);
    conditions.push(isNull(candidates.deletedAt));

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
