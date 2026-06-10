import {
  auditLogs,
  batchAssignments,
  batches,
  calls,
  candidates,
  db,
  domainEvents,
  programAssignments,
  programs,
  users,
} from "@lms/db";
import type { ActorType, Role, WorkflowStatus } from "@lms/shared";
import { and, desc, eq, inArray, isNull, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const schedulerUsers = alias(users, "scheduler_users");

export type CallRecord = {
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
  scheduledBy: string;
  schedulerName: string;
  title: string;
  description: string | null;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  meetingLink: string | null;
  status: WorkflowStatus;
  cancelledAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

const callSelect = {
  id: calls.id,
  candidateId: calls.candidateId,
  userId: candidates.userId,
  fullName: users.fullName,
  email: users.email,
  candidateCode: candidates.candidateCode,
  programId: candidates.programId,
  programName: programs.name,
  batchId: candidates.batchId,
  batchName: batches.name,
  scheduledBy: calls.scheduledBy,
  schedulerName: schedulerUsers.fullName,
  title: calls.title,
  description: calls.description,
  scheduledStartAt: calls.scheduledStartAt,
  scheduledEndAt: calls.scheduledEndAt,
  meetingLink: calls.meetingLink,
  status: calls.status,
  cancelledAt: calls.cancelledAt,
  isActive: calls.isActive,
  createdAt: calls.createdAt,
  updatedAt: calls.updatedAt,
  deletedAt: calls.deletedAt,
};

export class CallsRepository {
  async list(input: {
    role: Role;
    actorId: string;
    programId?: string;
    batchId?: string;
    candidateId?: string;
    status?: WorkflowStatus;
    includeArchived?: boolean;
  }) {
    const conditions = await this.buildCallScopeConditions(input.role, input.actorId);

    if (!input.includeArchived) {
      conditions.push(isNull(calls.deletedAt));
    }

    if (input.programId) {
      conditions.push(eq(candidates.programId, input.programId));
    }

    if (input.batchId) {
      conditions.push(eq(candidates.batchId, input.batchId));
    }

    if (input.candidateId) {
      conditions.push(eq(calls.candidateId, input.candidateId));
    }

    if (input.status) {
      conditions.push(eq(calls.status, input.status));
    }

    return this.baseQuery(conditions);
  }

  async findById(id: string, includeArchived = false) {
    const conditions: SQL[] = [eq(calls.id, id)];

    if (!includeArchived) {
      conditions.push(isNull(calls.deletedAt));
    }

    const [call] = await this.baseQuery(conditions, 1);

    return call ?? null;
  }

  async canAccessCall(input: { callId: string; role: Role; actorId: string }) {
    const conditions = await this.buildCallScopeConditions(input.role, input.actorId);
    conditions.push(eq(calls.id, input.callId), isNull(calls.deletedAt));

    const [call] = await db
      .select({ id: calls.id })
      .from(calls)
      .innerJoin(candidates, eq(candidates.id, calls.candidateId))
      .where(and(...conditions))
      .limit(1);

    return Boolean(call);
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

  async create(input: {
    candidateId: string;
    scheduledBy: string;
    title: string;
    description?: string;
    scheduledStartAt: Date;
    scheduledEndAt: Date;
    meetingLink?: string;
  }) {
    const [call] = await db
      .insert(calls)
      .values({
        candidateId: input.candidateId,
        scheduledBy: input.scheduledBy,
        title: input.title,
        description: input.description,
        scheduledStartAt: input.scheduledStartAt,
        scheduledEndAt: input.scheduledEndAt,
        meetingLink: input.meetingLink,
        status: "submitted",
        createdBy: input.scheduledBy,
        updatedBy: input.scheduledBy,
      })
      .returning({ id: calls.id });

    return call ? this.findById(call.id) : null;
  }

  async update(
    id: string,
    input: {
      title?: string;
      description?: string;
      scheduledStartAt?: Date;
      scheduledEndAt?: Date;
      meetingLink?: string;
      actorId: string;
    },
  ) {
    const [call] = await db
      .update(calls)
      .set({
        title: input.title,
        description: input.description,
        scheduledStartAt: input.scheduledStartAt,
        scheduledEndAt: input.scheduledEndAt,
        meetingLink: input.meetingLink,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(
        and(eq(calls.id, id), isNull(calls.deletedAt), eq(calls.status, "submitted")),
      )
      .returning({ id: calls.id });

    return call ? this.findById(call.id) : null;
  }

  async cancel(id: string, actorId: string) {
    const [call] = await db
      .update(calls)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .where(
        and(eq(calls.id, id), isNull(calls.deletedAt), eq(calls.status, "submitted")),
      )
      .returning({ id: calls.id });

    return call ? this.findById(call.id) : null;
  }

  async audit(input: {
    actorType: ActorType;
    actorId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
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
      metadata: {},
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

  private async baseQuery(conditions: SQL[], limit?: number): Promise<CallRecord[]> {
    const query = db
      .select(callSelect)
      .from(calls)
      .innerJoin(candidates, eq(candidates.id, calls.candidateId))
      .innerJoin(users, eq(users.id, candidates.userId))
      .innerJoin(schedulerUsers, eq(schedulerUsers.id, calls.scheduledBy))
      .innerJoin(programs, eq(programs.id, candidates.programId))
      .leftJoin(batches, eq(batches.id, candidates.batchId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(calls.scheduledStartAt));

    return limit ? await query.limit(limit) : await query;
  }

  private async buildCallScopeConditions(role: Role, actorId: string) {
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
