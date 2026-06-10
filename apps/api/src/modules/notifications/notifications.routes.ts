import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import {
  getNotificationPreferences,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from "./notifications.controller.js";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get("/", listNotifications);
notificationsRouter.get("/unread-count", getUnreadCount);
notificationsRouter.post("/read-all", markAllNotificationsRead);
notificationsRouter.get("/preferences", getNotificationPreferences);
notificationsRouter.put("/preferences", updateNotificationPreferences);
notificationsRouter.post("/:id/read", markNotificationRead);
