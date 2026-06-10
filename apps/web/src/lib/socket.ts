import { io, type Socket } from "socket.io-client";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

export const getChatSocket = (accessToken: string) => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(apiBaseUrl, {
    auth: { token: accessToken },
    transports: ["websocket", "polling"],
  });

  return socket;
};

export const disconnectChatSocket = () => {
  socket?.disconnect();
  socket = null;
};
