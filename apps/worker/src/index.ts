import { createNotificationWorker } from "./jobs/notifications/notification.worker.js";
import { scheduleNotificationJobs } from "./queues/notification-scheduler.js";

const workers = [createNotificationWorker()];

void scheduleNotificationJobs().catch((error) => {
  console.error("Failed to schedule notification jobs.", error);
});

console.log(`LMS worker started with ${workers.length} worker(s).`);
