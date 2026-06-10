import { Queue } from "bullmq";

import type { NotificationJobPayload } from "@lms/shared";

import { env } from "../../config/env.js";

const redisUrl = new URL(env.REDIS_URL);

const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  db: Number(redisUrl.pathname.replace("/", "") || 0),
  maxRetriesPerRequest: null,
};

let notificationQueue: Queue<NotificationJobPayload> | null = null;

export const getNotificationQueue = () => {
  if (!notificationQueue) {
    notificationQueue = new Queue<NotificationJobPayload>("notifications", {
      connection,
    });
  }

  return notificationQueue;
};

export const enqueueNotificationJob = async (payload: NotificationJobPayload) => {
  const queue = getNotificationQueue();

  await queue.add(payload.type, payload, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  });
};
