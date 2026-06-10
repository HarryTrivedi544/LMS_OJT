import { HttpError } from "../../errors/http-error.js";
import type {
  ListNotificationsInput,
  UpdateNotificationPreferencesInput,
} from "./notifications.schema.js";
import { NotificationsRepository, type NotificationRecord } from "./notifications.repository.js";

type ActorContext = {
  actorId: string;
};

const toNotificationResponse = (notification: NotificationRecord) => ({
  id: notification.id,
  userId: notification.userId,
  title: notification.title,
  body: notification.body,
  triggerName: notification.triggerName,
  channel: notification.channel,
  readAt: notification.readAt?.toISOString() ?? null,
  metadata: notification.metadata,
  emailSentAt: notification.emailSentAt?.toISOString() ?? null,
  createdAt: notification.createdAt.toISOString(),
});

export class NotificationsService {
  constructor(private readonly repository = new NotificationsRepository()) {}

  async listNotifications(input: ListNotificationsInput, context: ActorContext) {
    const notifications = await this.repository.listForUser(
      context.actorId,
      input.unreadOnly,
    );

    return notifications.map(toNotificationResponse);
  }

  async getUnreadCount(context: ActorContext) {
    const count = await this.repository.countUnread(context.actorId);

    return { count };
  }

  async markNotificationRead(id: string, context: ActorContext) {
    const notification = await this.repository.markRead(id, context.actorId);

    if (!notification) {
      throw new HttpError(404, "notification_not_found", "Notification not found.");
    }

    return toNotificationResponse(notification);
  }

  async markAllNotificationsRead(context: ActorContext) {
    await this.repository.markAllRead(context.actorId);

    return { updated: true };
  }

  async getPreferences(context: ActorContext) {
    const preferences = await this.repository.listPreferences(context.actorId);
    const emailPreference = preferences.find((preference) => preference.channel === "email");
    const inAppPreference = preferences.find((preference) => preference.channel === "in_app");

    return {
      emailEnabled: emailPreference?.isEnabled ?? true,
      inAppEnabled: inAppPreference?.isEnabled ?? true,
    };
  }

  async updatePreferences(input: UpdateNotificationPreferencesInput, context: ActorContext) {
    await this.repository.upsertPreference(context.actorId, "email", input.emailEnabled);
    await this.repository.upsertPreference(context.actorId, "in_app", input.inAppEnabled);

    return this.getPreferences(context);
  }
}
