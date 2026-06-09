import { createNotificationWorker } from "./jobs/notifications/notification.worker.js";

const workers = [createNotificationWorker()];

console.log(`LMS worker started with ${workers.length} worker(s).`);
