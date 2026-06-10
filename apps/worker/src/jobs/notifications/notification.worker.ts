import type { NotificationJobPayload } from "@lms/shared";
import { Worker } from "bullmq";

import { createRedisConnection } from "../../queues/connection.js";
import { processWorkflowNotification } from "./process-workflow-notification.js";
import {
  processDailyLogReminder,
  processWeeklyTimesheetReminder,
} from "./reminder-jobs.js";

export const createNotificationWorker = () =>
  new Worker<NotificationJobPayload>(
    "notifications",
    async (job) => {
      const payload = job.data;

      if (payload.type === "workflow") {
        await processWorkflowNotification(payload);
        return;
      }

      if (payload.type === "daily_log_reminder") {
        await processDailyLogReminder();
        return;
      }

      if (payload.type === "weekly_timesheet_reminder") {
        await processWeeklyTimesheetReminder();
      }
    },
    {
      connection: createRedisConnection(),
    },
  );
