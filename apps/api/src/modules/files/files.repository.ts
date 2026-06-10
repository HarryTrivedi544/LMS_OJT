import {
  auditLogs,
  batchAssignments,
  candidates,
  db,
  domainEvents,
  evidenceRegistry,
  files as fileRecords,
  programAssignments,
} from "@lms/db";
import type { ActorType, Role } from "@lms/shared";
import { and, desc, eq, inArray, isNull, or, type SQL } from "drizzle-orm";

export type StoredFileRecord = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  module: string;
  ownerUserId: string;
  candidateId: string | null;
  isPrivate: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

const fileSelect = {
  id: fileRecords.id,
  originalName: fileRecords.originalName,
  mimeType: fileRecords.mimeType,
  sizeBytes: fileRecords.sizeBytes,
  storageKey: fileRecords.storageKey,
  module: fileRecords.module,
  ownerUserId: fileRecords.ownerUserId,
  candidateId: fileRecords.candidateId,
  isPrivate: fileRecords.isPrivate,
  isActive: fileRecords.isActive,
  createdAt: fileRecords.createdAt,
  updatedAt: fileRecords.updatedAt,
  deletedAt: fileRecords.deletedAt,
};

export class FilesRepository {
  async list(input: {
    role: Role;
    actorId: string;
    module?: string;
    candidateId?: string;
  }) {
    const conditions = await this.buildFileScopeConditions(input.role, input.actorId);

    if (input.module) {
      conditions.push(eq(fileRecords.module, input.module));
    }

    if (input.candidateId) {
      conditions.push(eq(fileRecords.candidateId, input.candidateId));
    }

    return this.baseQuery(conditions);
  }

  async findCandidateByUserId(userId: string) {
    const [candidate] = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(and(eq(candidates.userId, userId), isNull(candidates.deletedAt)))
      .limit(1);

    return candidate ?? null;
  }

  async findById(id: string) {
    const [file] = await this.baseQuery(
      [eq(fileRecords.id, id), isNull(fileRecords.deletedAt)],
      1,
    );

    return file ?? null;
  }

  async canAccessFile(input: { fileId: string; role: Role; actorId: string }) {
    const conditions = await this.buildFileScopeConditions(input.role, input.actorId);
    conditions.push(eq(fileRecords.id, input.fileId), isNull(fileRecords.deletedAt));

    const [file] = await db
      .select({ id: fileRecords.id })
      .from(fileRecords)
      .leftJoin(candidates, eq(candidates.id, fileRecords.candidateId))
      .where(and(...conditions))
      .limit(1);

    return Boolean(file);
  }

  async create(input: {
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
    module: string;
    ownerUserId: string;
    candidateId?: string;
    isPrivate?: boolean;
  }) {
    const [file] = await db
      .insert(fileRecords)
      .values({
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        storageKey: input.storageKey,
        module: input.module,
        ownerUserId: input.ownerUserId,
        candidateId: input.candidateId,
        isPrivate: input.isPrivate ?? true,
        createdBy: input.ownerUserId,
        updatedBy: input.ownerUserId,
      })
      .returning({ id: fileRecords.id });

    if (!file) {
      return null;
    }

    await db.insert(evidenceRegistry).values({
      candidateId: input.candidateId,
      entityType: "file",
      entityId: file.id,
      evidenceType: input.module,
      metadata: {
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
      },
      createdBy: input.ownerUserId,
      updatedBy: input.ownerUserId,
    });

    return this.findById(file.id);
  }

  async audit(input: {
    actorType: ActorType;
    actorId?: string;
    action: string;
    entityType: string;
    entityId?: string;
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

  private async baseQuery(conditions: SQL[], limit?: number): Promise<StoredFileRecord[]> {
    const query = db
      .select(fileSelect)
      .from(fileRecords)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(fileRecords.createdAt));

    return limit ? await query.limit(limit) : await query;
  }

  private async buildFileScopeConditions(role: Role, actorId: string) {
    const conditions: SQL[] = [isNull(fileRecords.deletedAt)];

    if (role === "Super Admin") {
      return conditions;
    }

    if (role === "Program Admin") {
      const programIds = await this.listAssignedProgramIds(actorId);
      const candidateIds = await this.listCandidateIdsForPrograms(programIds);
      conditions.push(
        candidateIds.length > 0
          ? inArray(fileRecords.candidateId, candidateIds)
          : eq(fileRecords.ownerUserId, actorId),
      );
      return conditions;
    }

    if (role === "Program Lead") {
      const batchIds = await this.listAssignedBatchIds(actorId);
      const candidateIds = await this.listCandidateIdsForBatches(batchIds);
      conditions.push(
        candidateIds.length > 0
          ? inArray(fileRecords.candidateId, candidateIds)
          : eq(fileRecords.ownerUserId, actorId),
      );
      return conditions;
    }

    if (role === "Candidate") {
      const ownCandidate = await this.findCandidateByUserId(actorId);
      conditions.push(
        ownCandidate
          ? or(
              eq(fileRecords.ownerUserId, actorId),
              eq(fileRecords.candidateId, ownCandidate.id),
            )!
          : eq(fileRecords.ownerUserId, actorId),
      );
      return conditions;
    }

    conditions.push(eq(fileRecords.ownerUserId, actorId));

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

  private async listCandidateIdsForPrograms(programIds: string[]) {
    if (programIds.length === 0) {
      return [];
    }

    const rows = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(and(inArray(candidates.programId, programIds), isNull(candidates.deletedAt)));

    return rows.map((row) => row.id);
  }

  private async listCandidateIdsForBatches(batchIds: string[]) {
    if (batchIds.length === 0) {
      return [];
    }

    const rows = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(and(inArray(candidates.batchId, batchIds), isNull(candidates.deletedAt)));

    return rows.map((row) => row.id);
  }
}
