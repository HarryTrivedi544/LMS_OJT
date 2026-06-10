import {
  auditLogs,
  batchAssignments,
  batches,
  db,
  domainEvents,
  programAssignments,
  programs,
  users,
} from "@lms/db";
import type { ActorType, Role, WorkflowStatus } from "@lms/shared";
import { and, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";

export type ProgramRecord = {
  id: string;
  name: string;
  code: string;
  status: WorkflowStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type BatchRecord = ProgramRecord & {
  programId: string;
};

export type AssignmentRecord = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: Role;
  createdAt: Date;
  deletedAt: Date | null;
};

const programSelect = {
  id: programs.id,
  name: programs.name,
  code: programs.code,
  status: programs.status,
  isActive: programs.isActive,
  createdAt: programs.createdAt,
  updatedAt: programs.updatedAt,
  deletedAt: programs.deletedAt,
};

const batchSelect = {
  id: batches.id,
  programId: batches.programId,
  name: batches.name,
  code: batches.code,
  status: batches.status,
  isActive: batches.isActive,
  createdAt: batches.createdAt,
  updatedAt: batches.updatedAt,
  deletedAt: batches.deletedAt,
};

export class ProgramsRepository {
  async listPrograms(input: {
    status?: WorkflowStatus;
    search?: string;
    includeArchived?: boolean;
  }) {
    const conditions: SQL[] = [];

    if (!input.includeArchived) {
      conditions.push(isNull(programs.deletedAt));
    }

    if (input.status) {
      conditions.push(eq(programs.status, input.status));
    }

    if (input.search) {
      const pattern = `%${input.search}%`;
      conditions.push(or(ilike(programs.name, pattern), ilike(programs.code, pattern))!);
    }

    return db
      .select(programSelect)
      .from(programs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(programs.createdAt));
  }

  async findProgramById(id: string, includeArchived = false) {
    const conditions = [eq(programs.id, id)];

    if (!includeArchived) {
      conditions.push(isNull(programs.deletedAt));
    }

    const [program] = await db
      .select(programSelect)
      .from(programs)
      .where(and(...conditions))
      .limit(1);

    return program ?? null;
  }

  async findProgramByCode(code: string) {
    const [program] = await db
      .select(programSelect)
      .from(programs)
      .where(eq(programs.code, code))
      .limit(1);

    return program ?? null;
  }

  async createProgram(input: {
    name: string;
    code: string;
    status: WorkflowStatus;
    actorId: string;
  }) {
    const [program] = await db
      .insert(programs)
      .values({
        name: input.name,
        code: input.code,
        status: input.status,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      })
      .returning(programSelect);

    return program;
  }

  async updateProgram(
    id: string,
    input: {
      name?: string;
      code?: string;
      status?: WorkflowStatus;
      actorId: string;
    },
  ) {
    const [program] = await db
      .update(programs)
      .set({
        name: input.name,
        code: input.code,
        status: input.status,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(and(eq(programs.id, id), isNull(programs.deletedAt)))
      .returning(programSelect);

    return program ?? null;
  }

  async archiveProgram(id: string, actorId: string) {
    const [program] = await db
      .update(programs)
      .set({
        status: "cancelled",
        isActive: false,
        deletedAt: new Date(),
        deletedBy: actorId,
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .where(and(eq(programs.id, id), isNull(programs.deletedAt)))
      .returning(programSelect);

    return program ?? null;
  }

  async restoreProgram(id: string, actorId: string) {
    const [program] = await db
      .update(programs)
      .set({
        status: "draft",
        isActive: true,
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .where(eq(programs.id, id))
      .returning(programSelect);

    return program ?? null;
  }

  async listBatches(programId: string, input: { includeArchived?: boolean } = {}) {
    const conditions: SQL[] = [eq(batches.programId, programId)];

    if (!input.includeArchived) {
      conditions.push(isNull(batches.deletedAt));
    }

    return db
      .select(batchSelect)
      .from(batches)
      .where(and(...conditions))
      .orderBy(desc(batches.createdAt));
  }

  async findBatchById(id: string, includeArchived = false) {
    const conditions = [eq(batches.id, id)];

    if (!includeArchived) {
      conditions.push(isNull(batches.deletedAt));
    }

    const [batch] = await db
      .select(batchSelect)
      .from(batches)
      .where(and(...conditions))
      .limit(1);

    return batch ?? null;
  }

  async findBatchByCode(code: string) {
    const [batch] = await db
      .select(batchSelect)
      .from(batches)
      .where(eq(batches.code, code))
      .limit(1);

    return batch ?? null;
  }

  async createBatch(input: {
    programId: string;
    name: string;
    code: string;
    status: WorkflowStatus;
    actorId: string;
  }) {
    const [batch] = await db
      .insert(batches)
      .values({
        programId: input.programId,
        name: input.name,
        code: input.code,
        status: input.status,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      })
      .returning(batchSelect);

    return batch;
  }

  async updateBatch(
    id: string,
    input: {
      name?: string;
      code?: string;
      status?: WorkflowStatus;
      actorId: string;
    },
  ) {
    const [batch] = await db
      .update(batches)
      .set({
        name: input.name,
        code: input.code,
        status: input.status,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(and(eq(batches.id, id), isNull(batches.deletedAt)))
      .returning(batchSelect);

    return batch ?? null;
  }

  async archiveBatch(id: string, actorId: string) {
    const [batch] = await db
      .update(batches)
      .set({
        status: "cancelled",
        isActive: false,
        deletedAt: new Date(),
        deletedBy: actorId,
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .where(and(eq(batches.id, id), isNull(batches.deletedAt)))
      .returning(batchSelect);

    return batch ?? null;
  }

  async restoreBatch(id: string, actorId: string) {
    const [batch] = await db
      .update(batches)
      .set({
        status: "draft",
        isActive: true,
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .where(eq(batches.id, id))
      .returning(batchSelect);

    return batch ?? null;
  }

  async findUserById(id: string) {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        status: users.status,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user ?? null;
  }

  async listProgramAssignments(programId: string) {
    return db
      .select({
        id: programAssignments.id,
        userId: programAssignments.userId,
        fullName: users.fullName,
        email: users.email,
        role: programAssignments.role,
        createdAt: programAssignments.createdAt,
        deletedAt: programAssignments.deletedAt,
      })
      .from(programAssignments)
      .innerJoin(users, eq(users.id, programAssignments.userId))
      .where(and(eq(programAssignments.programId, programId), isNull(programAssignments.deletedAt)))
      .orderBy(desc(programAssignments.createdAt));
  }

  async findProgramAssignment(input: {
    programId: string;
    userId: string;
    role: "Program Admin";
  }) {
    const [assignment] = await db
      .select({
        id: programAssignments.id,
        userId: programAssignments.userId,
        role: programAssignments.role,
        createdAt: programAssignments.createdAt,
        deletedAt: programAssignments.deletedAt,
      })
      .from(programAssignments)
      .where(
        and(
          eq(programAssignments.programId, input.programId),
          eq(programAssignments.userId, input.userId),
          eq(programAssignments.role, input.role),
          isNull(programAssignments.deletedAt),
        ),
      )
      .limit(1);

    return assignment ?? null;
  }

  async listBatchAssignments(batchId: string) {
    return db
      .select({
        id: batchAssignments.id,
        userId: batchAssignments.userId,
        fullName: users.fullName,
        email: users.email,
        role: batchAssignments.role,
        createdAt: batchAssignments.createdAt,
        deletedAt: batchAssignments.deletedAt,
      })
      .from(batchAssignments)
      .innerJoin(users, eq(users.id, batchAssignments.userId))
      .where(and(eq(batchAssignments.batchId, batchId), isNull(batchAssignments.deletedAt)))
      .orderBy(desc(batchAssignments.createdAt));
  }

  async findBatchAssignment(input: {
    batchId: string;
    userId: string;
    role: "Program Lead";
  }) {
    const [assignment] = await db
      .select({
        id: batchAssignments.id,
        userId: batchAssignments.userId,
        role: batchAssignments.role,
        createdAt: batchAssignments.createdAt,
        deletedAt: batchAssignments.deletedAt,
      })
      .from(batchAssignments)
      .where(
        and(
          eq(batchAssignments.batchId, input.batchId),
          eq(batchAssignments.userId, input.userId),
          eq(batchAssignments.role, input.role),
          isNull(batchAssignments.deletedAt),
        ),
      )
      .limit(1);

    return assignment ?? null;
  }

  async createProgramAssignment(input: {
    programId: string;
    userId: string;
    role: "Program Admin";
    actorId: string;
  }) {
    const [assignment] = await db
      .insert(programAssignments)
      .values({
        programId: input.programId,
        userId: input.userId,
        role: input.role,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      })
      .returning({
        id: programAssignments.id,
        userId: programAssignments.userId,
        role: programAssignments.role,
        createdAt: programAssignments.createdAt,
        deletedAt: programAssignments.deletedAt,
      });

    return assignment;
  }

  async createBatchAssignment(input: {
    batchId: string;
    userId: string;
    role: "Program Lead";
    actorId: string;
  }) {
    const [assignment] = await db
      .insert(batchAssignments)
      .values({
        batchId: input.batchId,
        userId: input.userId,
        role: input.role,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      })
      .returning({
        id: batchAssignments.id,
        userId: batchAssignments.userId,
        role: batchAssignments.role,
        createdAt: batchAssignments.createdAt,
        deletedAt: batchAssignments.deletedAt,
      });

    return assignment;
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
}
