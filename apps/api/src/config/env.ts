import "dotenv/config";
import { z } from "zod";

const localSecretDefaults = {
  DATABASE_URL: "postgres://lms_user:lms_password@localhost:5432/lms_ojt",
  JWT_ACCESS_SECRET: "local-access-secret",
  JWT_REFRESH_SECRET: "local-refresh-secret",
  PAYLOAD_ENCRYPTION_KEY: "local-dev-only-payload-key-change-me",
  SIGNED_URL_SECRET: "local-signed-url-secret",
} as const;

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().default(localSecretDefaults.DATABASE_URL),
  JWT_ACCESS_SECRET: z.string().default(localSecretDefaults.JWT_ACCESS_SECRET),
  JWT_REFRESH_SECRET: z.string().default(localSecretDefaults.JWT_REFRESH_SECRET),
  JWT_ACCESS_EXPIRES_IN: z.string().default("30m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  REFRESH_TOKEN_COOKIE_NAME: z.string().default("lms_refresh_token"),
  PAYLOAD_ENCRYPTION_KEY: z.string().default(localSecretDefaults.PAYLOAD_ENCRYPTION_KEY),
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
  SIGNED_URL_SECRET: z.string().default(localSecretDefaults.SIGNED_URL_SECRET),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  API_BASE_URL: z.string().default("http://localhost:4000"),
  AI_FEATURES_ENABLED: z.coerce.boolean().default(false),
  AGENT_WORKFLOWS_ENABLED: z.coerce.boolean().default(false),
  MCP_SERVER_ENABLED: z.coerce.boolean().default(false),
  PGVECTOR_ENABLED: z.coerce.boolean().default(false),
});

const parsedEnv = envSchema.parse(process.env);

if (parsedEnv.NODE_ENV === "production") {
  const unsafeDefaults = Object.entries(localSecretDefaults)
    .filter(([key, defaultValue]) => parsedEnv[key as keyof typeof localSecretDefaults] === defaultValue)
    .map(([key]) => key);

  if (unsafeDefaults.length > 0) {
    throw new Error(
      `Production environment cannot use local default secrets: ${unsafeDefaults.join(", ")}`,
    );
  }
}

export const env = parsedEnv;
