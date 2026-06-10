import type { NotificationJobPayload } from "@lms/shared";
import { Queue } from "bullmq";

import { createRedisConnection } from "./connection.js";

export const scheduleNotificationJobs = async () => {
  const queue = new Queue<NotificationJobPayload>("notifications", {
    connection: createRedisConnection(),
  });

  await queue.add(
    "daily_log_reminder",
    { type: "daily_log_reminder" },
    {
      repeat: { pattern: "0 18 * * 1-5" },
      jobId: "daily-log-reminder",
    },
  );

  await queue.add(
    "weekly_timesheet_reminder",
    { type: "weekly_timesheet_reminder" },
    {
      repeat: { pattern: "0 9 * * 5" },
      jobId: "weekly-timesheet-reminder",
    },
  );

  console.log("Scheduled daily log and weekly timesheet reminder jobs.");
};
