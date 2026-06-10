import { db, notificationPreferences, notifications, users } from "@lms/db";
import type { NotificationChannel } from "@lms/shared";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

export type NotificationRecord = {
  id: string;
  userId: string;
  title: string;
  body: string;
  triggerName: string;
  channel: NotificationChannel;
  readAt: Date | null;
  metadata: Record<string, unknown>;
  emailSentAt: Date | null;
  createdAt: Date;
};

export type NotificationPreferenceRecord = {
  channel: NotificationChannel;
  isEnabled: boolean;
};

export class NotificationsRepository {
  async listForUser(userId: string, unreadOnly = false) {
    const conditions = [
      eq(notifications.userId, userId),
      eq(notifications.channel, "in_app"),
    ];

    if (unreadOnly) {
      conditions.push(isNull(notifications.readAt));
    }

    const rows = await db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        title: notifications.title,
        body: notifications.body,
        triggerName: notifications.triggerName,
        channel: notifications.channel,
        readAt: notifications.readAt,
        metadata: notifications.metadata,
        emailSentAt: notifications.emailSentAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt));

    return rows.map((row) => ({
      ...row,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
    }));
  }

  async countUnread(userId: string) {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.channel, "in_app"),
          isNull(notifications.readAt),
        ),
      );

    return result?.count ?? 0;
  }

  async findByIdForUser(id: string, userId: string) {
    const [notification] = await db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        title: notifications.title,
        body: notifications.body,
        triggerName: notifications.triggerName,
        channel: notifications.channel,
        readAt: notifications.readAt,
        metadata: notifications.metadata,
        emailSentAt: notifications.emailSentAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .limit(1);

    if (!notification) {
      return null;
    }

    return {
      ...notification,
      metadata: (notification.metadata ?? {}) as Record<string, unknown>,
    };
  }

  async markRead(id: string, userId: string) {
    const [notification] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId),
          isNull(notifications.readAt),
        ),
      )
      .returning({ id: notifications.id });

    return notification ? this.findByIdForUser(id, userId) : null;
  }

  async markAllRead(userId: string) {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.channel, "in_app"),
          isNull(notifications.readAt),
        ),
      );
  }

  async listPreferences(userId: string) {
    return db
      .select({
        channel: notificationPreferences.channel,
        isEnabled: notificationPreferences.isEnabled,
      })
      .from(notificationPreferences)
      .where(
        and(eq(notificationPreferences.userId, userId), isNull(notificationPreferences.deletedAt)),
      );
  }

  async upsertPreference(userId: string, channel: NotificationChannel, isEnabled: boolean) {
    const existing = await db
      .select({ id: notificationPreferences.id })
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.channel, channel),
          isNull(notificationPreferences.deletedAt),
        ),
      )
      .limit(1);

    if (existing[0]) {
      await db
        .update(notificationPreferences)
        .set({
          isEnabled,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(notificationPreferences.id, existing[0].id));
      return;
    }

    await db.insert(notificationPreferences).values({
      userId,
      channel,
      isEnabled,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async isChannelEnabled(userId: string, channel: NotificationChannel) {
    const [preference] = await db
      .select({ isEnabled: notificationPreferences.isEnabled })
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.channel, channel),
          isNull(notificationPreferences.deletedAt),
        ),
      )
      .limit(1);

    return preference?.isEnabled ?? true;
  }

  async findUserEmail(userId: string) {
    const [user] = await db
      .select({ email: users.email, fullName: users.fullName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user ?? null;
  }
}
