import { auditLogs, db, users } from "@lms/db";
import type { ActorType, Role, UserStatus } from "@lms/shared";
import { and, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";

export type UserRecord = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: UserStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

const userSelect = {
  id: users.id,
  email: users.email,
  fullName: users.fullName,
  role: users.role,
  status: users.status,
  isActive: users.isActive,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  deletedAt: users.deletedAt,
};

export class UsersRepository {
  async list(input: {
    role?: Role;
    status?: UserStatus;
    search?: string;
    includeArchived?: boolean;
  }) {
    const conditions: SQL[] = [];

    if (!input.includeArchived) {
      conditions.push(isNull(users.deletedAt));
    }

    if (input.role) {
      conditions.push(eq(users.role, input.role));
    }

    if (input.status) {
      conditions.push(eq(users.status, input.status));
    }

    if (input.search) {
      const searchPattern = `%${input.search}%`;
      conditions.push(
        or(ilike(users.email, searchPattern), ilike(users.fullName, searchPattern))!,
      );
    }

    return db
      .select(userSelect)
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(users.createdAt));
  }

  async findById(id: string, includeArchived = false) {
    const conditions = [eq(users.id, id)];

    if (!includeArchived) {
      conditions.push(isNull(users.deletedAt));
    }

    const [user] = await db
      .select(userSelect)
      .from(users)
      .where(and(...conditions))
      .limit(1);

    return user ?? null;
  }

  async findByEmail(email: string) {
    const [user] = await db
      .select(userSelect)
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user ?? null;
  }

  async create(input: {
    email: string;
    fullName: string;
    passwordHash: string;
    role: Role;
    status: UserStatus;
    actorId: string;
  }) {
    const [user] = await db
      .insert(users)
      .values({
        email: input.email,
        fullName: input.fullName,
        passwordHash: input.passwordHash,
        role: input.role,
        status: input.status,
        isActive: input.status === "active",
        createdBy: input.actorId,
        updatedBy: input.actorId,
      })
      .returning(userSelect);

    return user;
  }

  async update(
    id: string,
    input: {
      fullName?: string;
      passwordHash?: string;
      role?: Role;
      status?: UserStatus;
      actorId: string;
    },
  ) {
    const [user] = await db
      .update(users)
      .set({
        fullName: input.fullName,
        passwordHash: input.passwordHash,
        role: input.role,
        status: input.status,
        isActive: input.status ? input.status === "active" : undefined,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning(userSelect);

    return user ?? null;
  }

  async archive(id: string, actorId: string) {
    const [user] = await db
      .update(users)
      .set({
        status: "archived",
        isActive: false,
        deletedAt: new Date(),
        deletedBy: actorId,
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning(userSelect);

    return user ?? null;
  }

  async restore(id: string, actorId: string) {
    const [user] = await db
      .update(users)
      .set({
        status: "active",
        isActive: true,
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date(),
        updatedBy: actorId,
      })
      .where(eq(users.id, id))
      .returning(userSelect);

    return user ?? null;
  }

  async audit(input: {
    actorType: ActorType;
    actorId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
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
      oldValue: input.oldValue,
      newValue: input.newValue,
      metadata: input.metadata ?? {},
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
  }
}
