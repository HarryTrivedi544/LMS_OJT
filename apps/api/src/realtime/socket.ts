import type { Server as HttpServer } from "node:http";

import { Server } from "socket.io";

import { env } from "../config/env.js";

export const createRealtimeServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    // Room authorization will be enforced here after auth middleware is added.
    socket.data.actorType = "user";
    next();
  });

  io.on("connection", (socket) => {
    socket.emit("system.ready", {
      service: "lms-realtime",
      connectedAt: new Date().toISOString(),
    });
  });

  return io;
};
