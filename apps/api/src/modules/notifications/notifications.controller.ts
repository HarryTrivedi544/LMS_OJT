import type { RequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import {
  listNotificationsSchema,
  markNotificationReadSchema,
  updateNotificationPreferencesSchema,
} from "./notifications.schema.js";
import { NotificationsService } from "./notifications.service.js";

const notificationsService = new NotificationsService();

const getContext = (request: Parameters<RequestHandler>[0]) => ({
  actorId: request.auth?.userId ?? "",
});

export const listNotifications = asyncHandler(async (request, response) => {
  const input = listNotificationsSchema.parse({ query: request.query });
  const data = await notificationsService.listNotifications(input.query, getContext(request));

  response.status(200).json({ success: true, data });
});

export const getUnreadCount = asyncHandler(async (request, response) => {
  const data = await notificationsService.getUnreadCount(getContext(request));

  response.status(200).json({ success: true, data });
});

export const markNotificationRead = asyncHandler(async (request, response) => {
  const input = markNotificationReadSchema.parse({ params: request.params });
  const data = await notificationsService.markNotificationRead(
    input.params.id,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

export const markAllNotificationsRead = asyncHandler(async (request, response) => {
  const data = await notificationsService.markAllNotificationsRead(getContext(request));

  response.status(200).json({ success: true, data });
});

export const getNotificationPreferences = asyncHandler(async (request, response) => {
  const data = await notificationsService.getPreferences(getContext(request));

  response.status(200).json({ success: true, data });
});

export const updateNotificationPreferences = asyncHandler(async (request, response) => {
  const input = updateNotificationPreferencesSchema.parse({ body: request.body });
  const data = await notificationsService.updatePreferences(input.body, getContext(request));

  response.status(200).json({ success: true, data });
});
