import type { Server, Socket } from "socket.io";

import { ChatService } from "../modules/chat/chat.service.js";
import { ChatRepository } from "../modules/chat/chat.repository.js";

type SocketAuthData = {
  userId: string;
  role: string;
};

export const registerChatHandlers = (io: Server) => {
  const chatService = new ChatService();
  const chatRepository = new ChatRepository();

  io.on("connection", (socket: Socket) => {
    socket.emit("system.ready", {
      service: "lms-realtime",
      connectedAt: new Date().toISOString(),
    });

    const auth = socket.data as SocketAuthData;

    socket.on("chat.join", async (payload: { roomId: string }, callback) => {
      try {
        const canAccess = await chatRepository.canAccessRoom({
          roomId: payload.roomId,
          actorId: auth.userId,
          role: auth.role as never,
        });

        if (!canAccess) {
          callback?.({ success: false, error: "Chat room not found." });
          return;
        }

        await socket.join(`chat:${payload.roomId}`);
        callback?.({ success: true });
      } catch {
        callback?.({ success: false, error: "Failed to join chat room." });
      }
    });

    socket.on(
      "chat.send",
      async (payload: { roomId: string; body: string }, callback) => {
        try {
          const message = await chatService.sendMessage(
            payload.roomId,
            { body: payload.body },
            {
              actorId: auth.userId,
              role: auth.role as never,
            },
          );
          callback?.({ success: true, data: message });
        } catch (error) {
          callback?.({
            success: false,
            error: error instanceof Error ? error.message : "Failed to send message.",
          });
        }
      },
    );
  });
};
