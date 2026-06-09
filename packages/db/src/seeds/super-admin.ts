import "dotenv/config";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

import { auditLogs, users } from "../schema.js";
import { db, pool } from "../client.js";

const email = (process.env.SUPER_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
const password = process.env.SUPER_ADMIN_PASSWORD ?? "ChangeMe123!";
const fullName = process.env.SUPER_ADMIN_FULL_NAME ?? "Super Admin";

const main = async () => {
  const [existingUser] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    console.log(`Super Admin already exists: ${existingUser.email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [createdUser] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      fullName,
      role: "Super Admin",
      status: "active",
    })
    .returning({ id: users.id, email: users.email });

  if (!createdUser) {
    throw new Error("Failed to create Super Admin user.");
  }

  await db.insert(auditLogs).values({
    actorType: "system",
    action: "seed.super_admin.created",
    entityType: "user",
    entityId: createdUser.id,
    metadata: { email: createdUser.email },
  });

  console.log(`Created Super Admin: ${createdUser.email}`);
};

try {
  await main();
} finally {
  await pool.end();
}
