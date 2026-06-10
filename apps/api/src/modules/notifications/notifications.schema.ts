import { notificationChannels } from "@lms/shared";
import { z } from "zod";

const uuidSchema = z.uuid();

export const listNotificationsSchema = z.object({
  query: z.object({
    unreadOnly: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
  }),
});

export const markNotificationReadSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

export const updateNotificationPreferencesSchema = z.object({
  body: z.object({
    emailEnabled: z.boolean(),
    inAppEnabled: z.boolean(),
  }),
});

export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>["query"];
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>["body"];

export const notificationChannelSchema = z.enum(notificationChannels);
