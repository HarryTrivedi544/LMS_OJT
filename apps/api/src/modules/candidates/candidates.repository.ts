import {
  auditLogs,
  batchAssignments,
  batches,
  candidates,
  db,
  domainEvents,
  programAssignments,
  programs,
  users,
} from "@lms/db";
import type { ActorType, Role, UserStatus } from "@lms/shared";
import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  type SQL,
} from "drizzle-orm";

export type CandidateRecord = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  programId: string;
  programName: string;
  programCode: string;
  batchId: string | null;
  batchName: string | null;
  batchCode: string | null;
  candidateCode: string;
  currentPhase: string | null;
  currentDesignation: string | null;
  currentMonthlyFee: number | null;
  currentPhaseStartDate: string | null;
  status: UserStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CandidateOptionRecord = {
  programs: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  batches: Array<{
    id: string;
    programId: string;
    name: string;
    code: string;
  }>;
};

const candidateSelect = {
  id: candidates.id,
  userId: candidates.userId,
  fullName: users.fullName,
  email: users.email,
  programId: candidates.programId,
  programName: programs.name,
  programCode: programs.code,
  batchId: candidates.batchId,
  batchName: batches.name,
  batchCode: batches.code,
  candidateCode: candidates.candidateCode,
  currentPhase: candidates.currentPhase,
  currentDesignation: candidates.currentDesignation,
  currentMonthlyFee: candidates.currentMonthlyFee,
  currentPhaseStartDate: candidates.currentPhaseStartDate,
  status: candidates.status,
  isActive: candidates.isActive,
  createdAt: candidates.createdAt,
  updatedAt: candidates.updatedAt,
  deletedAt: candidates.deletedAt,
};

export class CandidatesRepository {
  async list(input: {
    role: Role;
    actorId: string;
    programId?: string;
    batchId?: string;
    status?: UserStatus;
    search?: string;
    includeArchived?: boolean;
  }) {
    const conditions = await this.buildCandidateScopeConditions(input.role, input.actorId);

    if (!input.includeArchived) {
      conditions.push(isNull(candidates.deletedAt));
    }

    if (input.programId) {
      conditions.push(eq(candidates.programId, input.programId));
    }

    if (input.batchId) {
      conditions.push(eq(candidates.batchId, input.batchId));
    }

    if (input.status) {
      conditions.push(eq(candidates.status, input.status));
    }

    if (input.search) {
      const pattern = `%${input.search}%`;
      conditions.push(
        or(
          ilike(users.fullName, pattern),
          ilike(users.email, pattern),
          ilike(candidates.candidateCode, pattern),
        )!,
      );
    }

    return db
      .select(candidateSelect)
      .from(candidates)
      .innerJoin(users, eq(users.id, candidates.userId))
      .innerJoin(programs, eq(programs.id, candidates.programId))
      .leftJoin(batches, eq(batches.id, candidates.batchId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(candidates.createdAt));
  }

  async findById(id: string, includeArchived = false) {
    const conditions: SQL[] = [eq(candidates.id, id)];

    if (!includeArchived) {
      conditions.push(isNull(candidates.deletedAt));
    }

    const [candidate] = await db
      .select(candidateSelect)
      .from(candidates)
      .innerJoin(users, eq(users.id, candidates.userId))
      .innerJoin(programs, eq(programs.id, candidates.programId))
      .leftJoin(batches, eq(batches.id, candidates.batchId))
      .where(and(...conditions))
      .limit(1);

    return candidate ?? null;
  }

  async findByCode(candidateCode: string) {
    const [candidate] = await db
      .select(candidateSelect)
      .from(candidates)
      .innerJoin(users, eq(users.id, candidates.userId))
      .innerJoin(programs, eq(programs.id, candidates.programId))
      .leftJoin(batches, eq(batches.id, candidates.batchId))
      .where(eq(candidates.candidateCode, candidateCode))
      .limit(1);

    return candidate ?? null;
  }

  async findUserByEmail(email: string) {
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
      .where(eq(users.email, email))
      .limit(1);

    return user ?? null;
  }

  async findProgramById(programId: string) {
    const [program] = await db
      .select({
        id: programs.id,
        name: programs.name,
        code: programs.code,
        deletedAt: programs.deletedAt,
        isActive: programs.isActive,
      })
      .from(programs)
      .where(eq(programs.id, programId))
      .limit(1);

    return program ?? null;
  }

  async findBatchById(batchId: string) {
    const [batch] = await db
      .select({
        id: batches.id,
        programId: batches.programId,
        name: batches.name,
        code: batches.code,
        deletedAt: batches.deletedAt,
        isActive: batches.isActive,
      })
      .from(batches)
      .where(eq(batches.id, batchId))
      .limit(1);

    return batch ?? null;
  }

  async isProgramAssignedToUser(programId: string, userId: string) {
    const [assignment] = await db
      .select({ id: programAssignments.id })
      .from(programAssignments)
      .where(
        and(
          eq(programAssignments.programId, programId),
          eq(programAssignments.userId, userId),
          eq(programAssignments.role, "Program Admin"),
          isNull(programAssignments.deletedAt),
        ),
      )
      .limit(1);

    return Boolean(assignment);
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

  async create(input: {
    fullName: string;
    email: string;
    passwordHash: string;
    candidateCode: string;
    programId: string;
    batchId?: string;
    status: UserStatus;
    actorId: string;
  }) {
    const candidateId = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: input.email,
          fullName: input.fullName,
          passwordHash: input.passwordHash,
          role: "Candidate",
          status: input.status,
          isActive: input.status === "active",
          createdBy: input.actorId,
          updatedBy: input.actorId,
        })
        .returning({ id: users.id });

      if (!user) {
        return null;
      }

      const [candidate] = await tx
        .insert(candidates)
        .values({
          userId: user.id,
          programId: input.programId,
          batchId: input.batchId,
          candidateCode: input.candidateCode,
          status: input.status,
          isActive: input.status === "active",
          createdBy: input.actorId,
          updatedBy: input.actorId,
        })
        .returning({ id: candidates.id });

      return candidate?.id ?? null;
    });

    return candidateId ? this.findById(candidateId) : null;
  }

  async applyPromotion(input: {
    candidateId: string;
    currentPhase: string;
    currentDesignation: string;
    currentMonthlyFee?: number | null;
    currentPhaseStartDate: string;
    actorId: string;
  }) {
    const [candidate] = await db
      .update(candidates)
      .set({
        currentPhase: input.currentPhase,
        currentDesignation: input.currentDesignation,
        currentMonthlyFee: input.currentMonthlyFee ?? null,
        currentPhaseStartDate: input.currentPhaseStartDate,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(eq(candidates.id, input.candidateId))
      .returning(candidateSelect);

    return candidate ?? null;
  }

  async archive(id: string, actorId: string) {
    const [candidate] = await db
      .update(candidates)
      .set({
        status: "archived",
        isActive: false,
        deletedAt: new Date(),
        deletedBy: actorId,
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .where(and(eq(candidates.id, id), isNull(candidates.deletedAt)))
      .returning({ id: candidates.id });

    return candidate ? this.findById(candidate.id, true) : null;
  }

  async restore(id: string, actorId: string) {
    const [candidate] = await db
      .update(candidates)
      .set({
        status: "active",
        isActive: true,
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .where(eq(candidates.id, id))
      .returning({ id: candidates.id });

    return candidate ? this.findById(candidate.id) : null;
  }

  async listOptions(input: { role: Role; actorId: string }): Promise<CandidateOptionRecord> {
    const programConditions: SQL[] = [isNull(programs.deletedAt)];
    const batchConditions: SQL[] = [isNull(batches.deletedAt)];

    if (input.role === "Program Admin") {
      const programIds = await this.listAssignedProgramIds(input.actorId);
      if (programIds.length === 0) {
        return { programs: [], batches: [] };
      }
      programConditions.push(inArray(programs.id, programIds));
      batchConditions.push(inArray(batches.programId, programIds));
    } else if (input.role === "Program Lead") {
      const batchIds = await this.listAssignedBatchIds(input.actorId);
      if (batchIds.length === 0) {
        return { programs: [], batches: [] };
      }
      batchConditions.push(inArray(batches.id, batchIds));
    } else if (input.role === "Candidate") {
      return { programs: [], batches: [] };
    }

    const batchRows = await db
      .select({
        id: batches.id,
        programId: batches.programId,
        name: batches.name,
        code: batches.code,
      })
      .from(batches)
      .where(and(...batchConditions))
      .orderBy(desc(batches.createdAt));

    if (input.role === "Program Lead") {
      const programIds = [...new Set(batchRows.map((batch) => batch.programId))];
      if (programIds.length === 0) {
        return { programs: [], batches: batchRows };
      }
      programConditions.push(inArray(programs.id, programIds));
    }

    const programRows = await db
      .select({
        id: programs.id,
        name: programs.name,
        code: programs.code,
      })
      .from(programs)
      .where(and(...programConditions))
      .orderBy(desc(programs.createdAt));

    return {
      programs: programRows,
      batches: batchRows,
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
