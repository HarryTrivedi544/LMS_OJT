import type { Role } from "@lms/shared";

import { publishChatMessageEvent } from "../../events/publish-mqtt-event.js";
import { HttpError } from "../../errors/http-error.js";
import { getRealtimeServer } from "../../realtime/socket.js";
import type { ListChatRoomsInput, SendChatMessageInput } from "./chat.schema.js";
import {
  ChatRepository,
  type ChatMessageRecord,
  type ChatRoomRecord,
} from "./chat.repository.js";

type ActorContext = {
  actorId: string;
  role: Role;
  ipAddress?: string;
  userAgent?: string;
};

const toRoomResponse = (room: ChatRoomRecord) => ({
  id: room.id,
  candidateId: room.candidateId,
  userId: room.userId,
  fullName: room.fullName,
  email: room.email,
  candidateCode: room.candidateCode,
  programId: room.programId,
  programName: room.programName,
  batchId: room.batchId,
  batchName: room.batchName,
  title: room.title,
  lastMessageAt: room.lastMessageAt?.toISOString() ?? null,
  isActive: room.isActive,
  createdAt: room.createdAt.toISOString(),
  updatedAt: room.updatedAt.toISOString(),
});

const toMessageResponse = (message: ChatMessageRecord) => ({
  id: message.id,
  roomId: message.roomId,
  senderUserId: message.senderUserId,
  senderName: message.senderName,
  body: message.body,
  createdAt: message.createdAt.toISOString(),
});

export class ChatService {
  constructor(private readonly repository = new ChatRepository()) {}

  async listRooms(input: ListChatRoomsInput, context: ActorContext) {
    const rooms = await this.repository.listRooms({
      ...input,
      actorId: context.actorId,
      role: context.role,
    });

    return rooms.map(toRoomResponse);
  }

  async getRoom(id: string, context: ActorContext) {
    const canAccess = await this.repository.canAccessRoom({
      roomId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(404, "chat_room_not_found", "Chat room not found.");
    }

    const room = await this.repository.findRoomById(id);

    if (!room) {
      throw new HttpError(404, "chat_room_not_found", "Chat room not found.");
    }

    return toRoomResponse(room);
  }

  async ensureRoom(candidateId: string, context: ActorContext) {
    const canAccess = await this.repository.canAccessCandidate({
      candidateId,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(404, "candidate_not_found", "Candidate not found in your scope.");
    }

    const room = await this.repository.ensureRoom({
      candidateId,
      title: "Candidate chat",
      actorId: context.actorId,
    });

    if (!room) {
      throw new HttpError(500, "chat_room_create_failed", "Failed to create chat room.");
    }

    return toRoomResponse(room);
  }

  async listMessages(roomId: string, context: ActorContext) {
    const canAccess = await this.repository.canAccessRoom({
      roomId,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(404, "chat_room_not_found", "Chat room not found.");
    }

    const messages = await this.repository.listMessages(roomId);

    return messages.map(toMessageResponse);
  }

  async sendMessage(roomId: string, input: SendChatMessageInput, context: ActorContext) {
    const canAccess = await this.repository.canAccessRoom({
      roomId,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(404, "chat_room_not_found", "Chat room not found.");
    }

    const message = await this.repository.createMessage({
      roomId,
      senderUserId: context.actorId,
      body: input.body,
    });

    if (!message) {
      throw new HttpError(500, "chat_message_create_failed", "Failed to send message.");
    }

    const messageResponse = toMessageResponse(message);

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "chat.message.sent",
      entityType: "chat_message",
      entityId: message.id,
      newValue: messageResponse,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "chat.message.sent",
      entityType: "chat_message",
      entityId: message.id,
      actorType: "user",
      actorId: context.actorId,
      payload: messageResponse,
    });

    await publishChatMessageEvent(roomId, messageResponse);

    const io = getRealtimeServer();

    if (io) {
      io.to(`chat:${roomId}`).emit("chat.message", messageResponse);
    }

    return messageResponse;
  }
}
