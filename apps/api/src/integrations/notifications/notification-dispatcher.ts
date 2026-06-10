import type { WorkflowNotificationJob } from "@lms/shared";

import { enqueueNotificationJob } from "./notification-queue.js";

export const dispatchWorkflowNotification = async (
  input: Omit<WorkflowNotificationJob, "type">,
) => {
  await enqueueNotificationJob({
    type: "workflow",
    ...input,
  });
};

export const dispatchWorkflowNotifications = async (
  notifications: Array<Omit<WorkflowNotificationJob, "type">>,
) => {
  await Promise.all(notifications.map((notification) => dispatchWorkflowNotification(notification)));
};
