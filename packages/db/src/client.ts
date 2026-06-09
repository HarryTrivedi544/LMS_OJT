import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgres://lms_user:lms_password@localhost:5432/lms_ojt";

export const pool = new Pool({
  connectionString: databaseUrl,
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;
