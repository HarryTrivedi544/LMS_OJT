import {
  db,
  notificationPreferences,
  notifications,
  users,
} from "@lms/db";
import type { WorkflowNotificationJob } from "@lms/shared";
import { and, eq, isNull } from "drizzle-orm";

import { env } from "../../config/env.js";
import { sendEmail } from "../../integrations/smtp.js";

const isChannelEnabled = async (userId: string, channel: "email" | "in_app") => {
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
};

export const processWorkflowNotification = async (job: WorkflowNotificationJob) => {
  const inAppEnabled = await isChannelEnabled(job.userId, "in_app");
  const emailEnabled = await isChannelEnabled(job.userId, "email");

  let notificationId: string | null = null;

  if (inAppEnabled) {
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: job.userId,
        title: job.title,
        body: job.body,
        triggerName: job.triggerName,
        channel: "in_app",
        metadata: job.metadata ?? {},
      })
      .returning({ id: notifications.id });

    notificationId = notification?.id ?? null;
  }

  if (emailEnabled) {
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, job.userId))
      .limit(1);

    if (user?.email) {
      const emailSent = await sendEmail({
        to: user.email,
        subject: job.title,
        text: `${job.body}\n\nView details: ${env.FRONTEND_URL}/notifications`,
      });

      if (emailSent && notificationId) {
        await db
          .update(notifications)
          .set({ emailSentAt: new Date() })
          .where(eq(notifications.id, notificationId));
      }
    }
  }
};
