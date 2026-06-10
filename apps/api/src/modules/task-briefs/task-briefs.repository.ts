import {
  auditLogs,
  batchAssignments,
  batches,
  candidates,
  db,
  domainEvents,
  programAssignments,
  programs,
  taskBriefs,
  users,
} from "@lms/db";
import type { ActorType, Role, WorkflowStatus } from "@lms/shared";
import { and, desc, eq, inArray, isNull, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const assignerUsers = alias(users, "assigner_users");

export type TaskBriefRecord = {
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
  assignedBy: string;
  assignedByName: string;
  title: string;
  description: string;
  taskReference: string | null;
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  status: WorkflowStatus;
  acknowledgedAt: Date | null;
  submissionSummary: string | null;
  submissionDeliverables: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

const taskBriefSelect = {
  id: taskBriefs.id,
  candidateId: taskBriefs.candidateId,
  userId: candidates.userId,
  fullName: users.fullName,
  email: users.email,
  candidateCode: candidates.candidateCode,
  programId: candidates.programId,
  programName: programs.name,
  batchId: candidates.batchId,
  batchName: batches.name,
  assignedBy: taskBriefs.assignedBy,
  assignedByName: assignerUsers.fullName,
  title: taskBriefs.title,
  description: taskBriefs.description,
  taskReference: taskBriefs.taskReference,
  priority: taskBriefs.priority,
  dueDate: taskBriefs.dueDate,
  status: taskBriefs.status,
  acknowledgedAt: taskBriefs.acknowledgedAt,
  submissionSummary: taskBriefs.submissionSummary,
  submissionDeliverables: taskBriefs.submissionDeliverables,
  submittedAt: taskBriefs.submittedAt,
  reviewedAt: taskBriefs.reviewedAt,
  reviewedBy: taskBriefs.reviewedBy,
  reviewNote: taskBriefs.reviewNote,
  isActive: taskBriefs.isActive,
  createdAt: taskBriefs.createdAt,
  updatedAt: taskBriefs.updatedAt,
  deletedAt: taskBriefs.deletedAt,
};

export class TaskBriefsRepository {
  async list(input: {
    role: Role;
    actorId: string;
    programId?: string;
    batchId?: string;
    candidateId?: string;
    status?: WorkflowStatus;
    includeArchived?: boolean;
  }) {
    const conditions = await this.buildTaskBriefScopeConditions(input.role, input.actorId);

    if (!input.includeArchived) {
      conditions.push(isNull(taskBriefs.deletedAt));
    }

    if (input.programId) {
      conditions.push(eq(candidates.programId, input.programId));
    }

    if (input.batchId) {
      conditions.push(eq(candidates.batchId, input.batchId));
    }

    if (input.candidateId) {
      conditions.push(eq(taskBriefs.candidateId, input.candidateId));
    }

    if (input.status) {
      conditions.push(eq(taskBriefs.status, input.status));
    }

    return this.baseQuery(conditions);
  }

  async findById(id: string, includeArchived = false) {
    const conditions: SQL[] = [eq(taskBriefs.id, id)];

    if (!includeArchived) {
      conditions.push(isNull(taskBriefs.deletedAt));
    }

    const [taskBrief] = await this.baseQuery(conditions, 1);

    return taskBrief ?? null;
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

  async canAccessTaskBrief(input: {
    taskBriefId: string;
    role: Role;
    actorId: string;
    includeArchived?: boolean;
  }) {
    const conditions = await this.buildTaskBriefScopeConditions(input.role, input.actorId);
    conditions.push(eq(taskBriefs.id, input.taskBriefId));

    if (!input.includeArchived) {
      conditions.push(isNull(taskBriefs.deletedAt));
    }

    const [taskBrief] = await db
      .select({ id: taskBriefs.id })
      .from(taskBriefs)
      .innerJoin(candidates, eq(candidates.id, taskBriefs.candidateId))
      .where(and(...conditions))
      .limit(1);

    return Boolean(taskBrief);
  }

  async create(input: {
    candidateId: string;
    assignedBy: string;
    title: string;
    description: string;
    taskReference?: string;
    priority: "low" | "medium" | "high";
    dueDate?: string;
  }) {
    const [taskBrief] = await db
      .insert(taskBriefs)
      .values({
        candidateId: input.candidateId,
        assignedBy: input.assignedBy,
        title: input.title,
        description: input.description,
        taskReference: input.taskReference,
        priority: input.priority,
        dueDate: input.dueDate,
        status: "draft",
        createdBy: input.assignedBy,
        updatedBy: input.assignedBy,
      })
      .returning({ id: taskBriefs.id });

    return taskBrief ? this.findById(taskBrief.id) : null;
  }

  async acknowledge(id: string, actorId: string) {
    const [taskBrief] = await db
      .update(taskBriefs)
      .set({
        acknowledgedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .where(
        and(
          eq(taskBriefs.id, id),
          isNull(taskBriefs.deletedAt),
          eq(taskBriefs.status, "draft"),
        ),
      )
      .returning({ id: taskBriefs.id });

    return taskBrief ? this.findById(taskBrief.id) : null;
  }

  async submit(
    id: string,
    input: {
      submissionSummary: string;
      submissionDeliverables?: string;
      actorId: string;
    },
  ) {
    const [taskBrief] = await db
      .update(taskBriefs)
      .set({
        submissionSummary: input.submissionSummary,
        submissionDeliverables: input.submissionDeliverables,
        status: "submitted",
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        reviewNote: null,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(and(eq(taskBriefs.id, id), isNull(taskBriefs.deletedAt)))
      .returning({ id: taskBriefs.id });

    return taskBrief ? this.findById(taskBrief.id) : null;
  }

  async review(
    id: string,
    input: {
      status: "under_review" | "approved" | "rejected" | "revision_required";
      reviewNote?: string;
      actorId: string;
    },
  ) {
    const [taskBrief] = await db
      .update(taskBriefs)
      .set({
        status: input.status,
        reviewNote: input.reviewNote,
        reviewedAt: new Date(),
        reviewedBy: input.actorId,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(and(eq(taskBriefs.id, id), isNull(taskBriefs.deletedAt)))
      .returning({ id: taskBriefs.id });

    return taskBrief ? this.findById(taskBrief.id) : null;
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

  private async baseQuery(conditions: SQL[], limit?: number): Promise<TaskBriefRecord[]> {
    const query = db
      .select(taskBriefSelect)
      .from(taskBriefs)
      .innerJoin(candidates, eq(candidates.id, taskBriefs.candidateId))
      .innerJoin(users, eq(users.id, candidates.userId))
      .innerJoin(assignerUsers, eq(assignerUsers.id, taskBriefs.assignedBy))
      .innerJoin(programs, eq(programs.id, candidates.programId))
      .leftJoin(batches, eq(batches.id, candidates.batchId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(taskBriefs.dueDate), desc(taskBriefs.createdAt));

    return limit ? await query.limit(limit) : await query;
  }

  private async buildTaskBriefScopeConditions(role: Role, actorId: string) {
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
