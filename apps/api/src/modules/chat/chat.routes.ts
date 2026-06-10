import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import {
  ensureChatRoom,
  getChatRoom,
  listChatMessages,
  listChatRooms,
  sendChatMessage,
} from "./chat.controller.js";

export const chatRouter = Router();

chatRouter.use(authenticate);

chatRouter.get("/rooms", listChatRooms);
chatRouter.post("/rooms", ensureChatRoom);
chatRouter.get("/rooms/:id", getChatRoom);
chatRouter.get("/rooms/:id/messages", listChatMessages);
chatRouter.post("/rooms/:id/messages", sendChatMessage);
