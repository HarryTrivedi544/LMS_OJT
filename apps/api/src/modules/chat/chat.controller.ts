import type { RequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import {
  ensureChatRoomSchema,
  getChatRoomSchema,
  listChatMessagesSchema,
  listChatRoomsSchema,
  sendChatMessageSchema,
} from "./chat.schema.js";
import { ChatService } from "./chat.service.js";

const chatService = new ChatService();

const getContext = (request: Parameters<RequestHandler>[0]) => ({
  actorId: request.auth?.userId ?? "",
  role: request.auth?.role ?? "Candidate",
  ipAddress: request.ip,
  userAgent: request.header("user-agent"),
});

export const listChatRooms = asyncHandler(async (request, response) => {
  const input = listChatRoomsSchema.parse({ query: request.query });
  const data = await chatService.listRooms(input.query, getContext(request));

  response.status(200).json({ success: true, data });
});

export const getChatRoom = asyncHandler(async (request, response) => {
  const input = getChatRoomSchema.parse({ params: request.params });
  const data = await chatService.getRoom(input.params.id, getContext(request));

  response.status(200).json({ success: true, data });
});

export const ensureChatRoom = asyncHandler(async (request, response) => {
  const input = ensureChatRoomSchema.parse({ body: request.body });
  const data = await chatService.ensureRoom(input.body.candidateId, getContext(request));

  response.status(201).json({ success: true, data });
});

export const listChatMessages = asyncHandler(async (request, response) => {
  const input = listChatMessagesSchema.parse({ params: request.params });
  const data = await chatService.listMessages(input.params.id, getContext(request));

  response.status(200).json({ success: true, data });
});

export const sendChatMessage = asyncHandler(async (request, response) => {
  const input = sendChatMessageSchema.parse({
    params: request.params,
    body: request.body,
  });
  const data = await chatService.sendMessage(
    input.params.id,
    input.body,
    getContext(request),
  );

  response.status(201).json({ success: true, data });
});
