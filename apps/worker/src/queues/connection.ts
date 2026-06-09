import { env } from "../config/env.js";

export const createRedisConnection = () => {
  const redisUrl = new URL(env.REDIS_URL);

  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    db: Number(redisUrl.pathname.replace("/", "") || 0),
    maxRetriesPerRequest: null,
  };
};
