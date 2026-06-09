import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().default("postgres://lms_user:lms_password@localhost:5432/lms_ojt"),
  JWT_ACCESS_SECRET: z.string().default("local-access-secret"),
  JWT_REFRESH_SECRET: z.string().default("local-refresh-secret"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("30m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  PAYLOAD_ENCRYPTION_KEY: z.string().default("local-dev-only-payload-key-change-me"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  MQTT_URL: z.string().default("mqtt://localhost:1883"),
  MQTT_USERNAME: z.string().optional(),
  MQTT_PASSWORD: z.string().optional(),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  FILE_STORAGE_ROOT: z.string().default("./storage"),
  SIGNED_URL_SECRET: z.string().default("local-signed-url-secret"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  API_BASE_URL: z.string().default("http://localhost:4000"),
  AI_FEATURES_ENABLED: z.coerce.boolean().default(false),
  AGENT_WORKFLOWS_ENABLED: z.coerce.boolean().default(false),
  MCP_SERVER_ENABLED: z.coerce.boolean().default(false),
  PGVECTOR_ENABLED: z.coerce.boolean().default(false),
});

export const env = envSchema.parse(process.env);
