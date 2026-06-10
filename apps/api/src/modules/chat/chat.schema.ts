import { z } from "zod";

const uuidSchema = z.uuid();

export const listChatRoomsSchema = z.object({
  query: z.object({
    candidateId: uuidSchema.optional(),
  }),
});

export const getChatRoomSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

export const listChatMessagesSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

export const sendChatMessageSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    body: z.string().trim().min(1).max(5000),
  }),
});

export const ensureChatRoomSchema = z.object({
  body: z.object({
    candidateId: uuidSchema,
  }),
});

export type ListChatRoomsInput = z.infer<typeof listChatRoomsSchema>["query"];
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>["body"];
