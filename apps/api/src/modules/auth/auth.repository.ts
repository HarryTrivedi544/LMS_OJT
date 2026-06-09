import { auditLogs, db, refreshTokens, users } from "@lms/db";
import type { ActorType, Role } from "@lms/shared";
import { and, eq, gt, isNull } from "drizzle-orm";

export type AuthUser = {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
  status: "active" | "inactive" | "suspended" | "archived";
};

export class AuthRepository {
  async findUserByEmail(email: string) {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        fullName: users.fullName,
        role: users.role,
        status: users.status,
        deletedAt: users.deletedAt,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user ?? null;
  }

  async findActiveUserById(userId: string) {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.status, "active"),
          eq(users.isActive, true),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    return user ?? null;
  }

  async createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    const [token] = await db
      .insert(refreshTokens)
      .values(input)
      .returning({
        id: refreshTokens.id,
        userId: refreshTokens.userId,
        expiresAt: refreshTokens.expiresAt,
      });

    return token;
  }

  async findValidRefreshToken(tokenHash: string) {
    const [token] = await db
      .select({
        id: refreshTokens.id,
        userId: refreshTokens.userId,
        expiresAt: refreshTokens.expiresAt,
      })
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return token ?? null;
  }

  async revokeRefreshToken(tokenHash: string) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)));
  }

  async audit(input: {
    actorType: ActorType;
    actorId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    await db.insert(auditLogs).values({
      actorType: input.actorType,
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? {},
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
  }
}
