import type { Server as HttpServer } from "node:http";

import type { Role } from "@lms/shared";
import { Server } from "socket.io";

import { env } from "../config/env.js";
import { AuthRepository } from "../modules/auth/auth.repository.js";
import { verifyAccessToken } from "../security/tokens.js";
import { registerChatHandlers } from "./chat-handlers.js";

let io: Server | null = null;
const authRepository = new AuthRepository();

export const createRealtimeServer = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ??
        (socket.handshake.headers.authorization?.replace("Bearer ", "") as string | undefined);

      if (!token) {
        next(new Error("Authentication token is required."));
        return;
      }

      const payload = verifyAccessToken(token);
      const user = await authRepository.findActiveUserById(payload.sub);

      if (!user) {
        next(new Error("Invalid authentication token."));
        return;
      }

      socket.data.userId = user.id;
      socket.data.role = user.role as Role;
      socket.data.actorType = "user";
      next();
    } catch {
      next(new Error("Invalid authentication token."));
    }
  });

  registerChatHandlers(io);

  return io;
};

export const getRealtimeServer = () => io;
