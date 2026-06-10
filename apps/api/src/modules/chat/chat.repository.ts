import {
  auditLogs,
  batchAssignments,
  batches,
  candidates,
  chatMessages,
  chatRooms,
  db,
  domainEvents,
  programAssignments,
  programs,
  users,
} from "@lms/db";
import type { ActorType, Role } from "@lms/shared";
import { and, asc, desc, eq, inArray, isNull, type SQL } from "drizzle-orm";

export type ChatRoomRecord = {
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
  title: string;
  lastMessageAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ChatMessageRecord = {
  id: string;
  roomId: string;
  senderUserId: string;
  senderName: string;
  body: string;
  createdAt: Date;
};

const roomSelect = {
  id: chatRooms.id,
  candidateId: chatRooms.candidateId,
  userId: candidates.userId,
  fullName: users.fullName,
  email: users.email,
  candidateCode: candidates.candidateCode,
  programId: candidates.programId,
  programName: programs.name,
  batchId: candidates.batchId,
  batchName: batches.name,
  title: chatRooms.title,
  lastMessageAt: chatRooms.lastMessageAt,
  isActive: chatRooms.isActive,
  createdAt: chatRooms.createdAt,
  updatedAt: chatRooms.updatedAt,
};

export class ChatRepository {
  async listRooms(input: { role: Role; actorId: string; candidateId?: string }) {
    const conditions = await this.buildRoomScopeConditions(input.role, input.actorId);

    if (input.candidateId) {
      conditions.push(eq(chatRooms.candidateId, input.candidateId));
    }

    return this.roomQuery(conditions);
  }

  async findRoomById(id: string) {
    const [room] = await this.roomQuery([eq(chatRooms.id, id), isNull(chatRooms.deletedAt)], 1);

    return room ?? null;
  }

  async findRoomByCandidateId(candidateId: string) {
    const [room] = await this.roomQuery(
      [eq(chatRooms.candidateId, candidateId), isNull(chatRooms.deletedAt)],
      1,
    );

    return room ?? null;
  }

  async canAccessRoom(input: { roomId: string; role: Role; actorId: string }) {
    const conditions = await this.buildRoomScopeConditions(input.role, input.actorId);
    conditions.push(eq(chatRooms.id, input.roomId), isNull(chatRooms.deletedAt));

    const [room] = await db
      .select({ id: chatRooms.id })
      .from(chatRooms)
      .innerJoin(candidates, eq(candidates.id, chatRooms.candidateId))
      .where(and(...conditions))
      .limit(1);

    return Boolean(room);
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

  async ensureRoom(input: {
    candidateId: string;
    title: string;
    actorId: string;
  }) {
    const existingRoom = await this.findRoomByCandidateId(input.candidateId);

    if (existingRoom) {
      return existingRoom;
    }

    const [room] = await db
      .insert(chatRooms)
      .values({
        candidateId: input.candidateId,
        title: input.title,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      })
      .returning({ id: chatRooms.id });

    return room ? this.findRoomById(room.id) : null;
  }

  async listMessages(roomId: string) {
    const rows = await db
      .select({
        id: chatMessages.id,
        roomId: chatMessages.roomId,
        senderUserId: chatMessages.senderUserId,
        senderName: users.fullName,
        body: chatMessages.body,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .innerJoin(users, eq(users.id, chatMessages.senderUserId))
      .where(eq(chatMessages.roomId, roomId))
      .orderBy(asc(chatMessages.createdAt));

    return rows;
  }

  async createMessage(input: {
    roomId: string;
    senderUserId: string;
    body: string;
  }) {
    const [message] = await db
      .insert(chatMessages)
      .values({
        roomId: input.roomId,
        senderUserId: input.senderUserId,
        body: input.body,
      })
      .returning({ id: chatMessages.id });

    await db
      .update(chatRooms)
      .set({
        lastMessageAt: new Date(),
        updatedAt: new Date(),
        updatedBy: input.senderUserId,
      })
      .where(eq(chatRooms.id, input.roomId));

    if (!message) {
      return null;
    }

    const [savedMessage] = await db
      .select({
        id: chatMessages.id,
        roomId: chatMessages.roomId,
        senderUserId: chatMessages.senderUserId,
        senderName: users.fullName,
        body: chatMessages.body,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .innerJoin(users, eq(users.id, chatMessages.senderUserId))
      .where(eq(chatMessages.id, message.id))
      .limit(1);

    return savedMessage ?? null;
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

  private async roomQuery(conditions: SQL[], limit?: number): Promise<ChatRoomRecord[]> {
    const query = db
      .select(roomSelect)
      .from(chatRooms)
      .innerJoin(candidates, eq(candidates.id, chatRooms.candidateId))
      .innerJoin(users, eq(users.id, candidates.userId))
      .innerJoin(programs, eq(programs.id, candidates.programId))
      .leftJoin(batches, eq(batches.id, candidates.batchId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(chatRooms.lastMessageAt), desc(chatRooms.createdAt));

    return limit ? await query.limit(limit) : await query;
  }

  private async buildRoomScopeConditions(role: Role, actorId: string) {
    const conditions = await this.buildCandidateScopeConditions(role, actorId);
    conditions.push(isNull(chatRooms.deletedAt));

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
