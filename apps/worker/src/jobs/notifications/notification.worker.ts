import { Worker } from "bullmq";

import { createRedisConnection } from "../../queues/connection.js";

export const createNotificationWorker = () =>
  new Worker(
    "notifications",
    async (job) => {
      console.log(`Processing notification job ${job.id}`);
    },
    {
      connection: createRedisConnection(),
    },
  );
