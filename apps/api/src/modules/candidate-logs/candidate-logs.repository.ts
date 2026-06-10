import {
  auditLogs,
  batchAssignments,
  batches,
  candidateLogs,
  candidates,
  db,
  domainEvents,
  programAssignments,
  programs,
  users,
} from "@lms/db";
import type { ActorType, Role, WorkflowStatus } from "@lms/shared";
import { and, desc, eq, inArray, isNull, type SQL } from "drizzle-orm";

export type CandidateLogEntryRecord = {
  taskReference: string;
  taskDescription: string;
  projectReference: string;
  taskType: string;
  startTime: string;
  endTime: string;
  hours: number;
  outputDelivered?: string;
  toolTechnology: string;
  status: string;
  notesBlocker?: string;
};

export type CandidateLogRecord = {
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
  logDate: string;
  minutesSpent: number;
  entries: CandidateLogEntryRecord[];
  summary: string;
  blockers: string | null;
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

const candidateLogSelect = {
  id: candidateLogs.id,
  candidateId: candidateLogs.candidateId,
  userId: candidates.userId,
  fullName: users.fullName,
  email: users.email,
  candidateCode: candidates.candidateCode,
  programId: candidates.programId,
  programName: programs.name,
  batchId: candidates.batchId,
  batchName: batches.name,
  logDate: candidateLogs.logDate,
  minutesSpent: candidateLogs.minutesSpent,
  entries: candidateLogs.entries,
  summary: candidateLogs.summary,
  blockers: candidateLogs.blockers,
  status: candidateLogs.status,
  submittedAt: candidateLogs.submittedAt,
  reviewedAt: candidateLogs.reviewedAt,
  reviewedBy: candidateLogs.reviewedBy,
  reviewNote: candidateLogs.reviewNote,
  isActive: candidateLogs.isActive,
  createdAt: candidateLogs.createdAt,
  updatedAt: candidateLogs.updatedAt,
  deletedAt: candidateLogs.deletedAt,
};

export class CandidateLogsRepository {
  async list(input: {
    role: Role;
    actorId: string;
    candidateId?: string;
    status?: WorkflowStatus;
    logDate?: string;
    includeArchived?: boolean;
  }) {
    const conditions = await this.buildLogScopeConditions(input.role, input.actorId);

    if (!input.includeArchived) {
      conditions.push(isNull(candidateLogs.deletedAt));
    }

    if (input.candidateId) {
      conditions.push(eq(candidateLogs.candidateId, input.candidateId));
    }

    if (input.status) {
      conditions.push(eq(candidateLogs.status, input.status));
    }

    if (input.logDate) {
      conditions.push(eq(candidateLogs.logDate, input.logDate));
    }

    return this.baseQuery(conditions);
  }

  async findById(id: string, includeArchived = false) {
    const conditions: SQL[] = [eq(candidateLogs.id, id)];

    if (!includeArchived) {
      conditions.push(isNull(candidateLogs.deletedAt));
    }

    const [log] = await this.baseQuery(conditions, 1);

    return log ?? null;
  }

  async findByCandidateAndDate(candidateId: string, logDate: string) {
    const [log] = await this.baseQuery([
      eq(candidateLogs.candidateId, candidateId),
      eq(candidateLogs.logDate, logDate),
    ], 1);

    return log ?? null;
  }

  async findCandidateById(candidateId: string) {
    const [candidate] = await db
      .select({
        id: candidates.id,
        userId: candidates.userId,
        status: candidates.status,
        deletedAt: candidates.deletedAt,
      })
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .limit(1);

    return candidate ?? null;
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

  async canAccessCandidate(input: {
    candidateId: string;
    role: Role;
    actorId: string;
  }) {
    const conditions = await this.buildCandidateScopeConditions(input.role, input.actorId);
    conditions.push(eq(candidates.id, input.candidateId), isNull(candidates.deletedAt));

    const [candidate] = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(and(...conditions))
      .limit(1);

    return Boolean(candidate);
  }

  async canAccessLog(input: {
    logId: string;
    role: Role;
    actorId: string;
    includeArchived?: boolean;
  }) {
    const conditions = await this.buildLogScopeConditions(input.role, input.actorId);
    conditions.push(eq(candidateLogs.id, input.logId));

    if (!input.includeArchived) {
      conditions.push(isNull(candidateLogs.deletedAt));
    }

    const [log] = await db
      .select({ id: candidateLogs.id })
      .from(candidateLogs)
      .innerJoin(candidates, eq(candidates.id, candidateLogs.candidateId))
      .where(and(...conditions))
      .limit(1);

    return Boolean(log);
  }

  async create(input: {
    candidateId: string;
    logDate: string;
    minutesSpent: number;
    entries: CandidateLogEntryRecord[];
    summary: string;
    blockers?: string;
    actorId: string;
  }) {
    const [log] = await db
      .insert(candidateLogs)
      .values({
        candidateId: input.candidateId,
        logDate: input.logDate,
        minutesSpent: input.minutesSpent,
        entries: input.entries,
        summary: input.summary,
        blockers: input.blockers,
        status: "submitted",
        createdBy: input.actorId,
        updatedBy: input.actorId,
      })
      .returning({ id: candidateLogs.id });

    return log ? this.findById(log.id) : null;
  }

  async review(
    id: string,
    input: {
      status: "under_review" | "approved" | "rejected" | "revision_required";
      reviewNote?: string;
      actorId: string;
    },
  ) {
    const [log] = await db
      .update(candidateLogs)
      .set({
        status: input.status,
        reviewNote: input.reviewNote,
        reviewedAt: new Date(),
        reviewedBy: input.actorId,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(and(eq(candidateLogs.id, id), isNull(candidateLogs.deletedAt)))
      .returning({ id: candidateLogs.id });

    return log ? this.findById(log.id) : null;
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

  private async baseQuery(conditions: SQL[], limit?: number): Promise<CandidateLogRecord[]> {
    const query = db
      .select(candidateLogSelect)
      .from(candidateLogs)
      .innerJoin(candidates, eq(candidates.id, candidateLogs.candidateId))
      .innerJoin(users, eq(users.id, candidates.userId))
      .innerJoin(programs, eq(programs.id, candidates.programId))
      .leftJoin(batches, eq(batches.id, candidates.batchId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(candidateLogs.logDate), desc(candidateLogs.createdAt));

    const rows = limit ? await query.limit(limit) : await query;

    return rows.map((row) => ({
      ...row,
      entries: Array.isArray(row.entries)
        ? (row.entries as CandidateLogEntryRecord[])
        : [],
    }));
  }

  private async buildLogScopeConditions(role: Role, actorId: string) {
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
