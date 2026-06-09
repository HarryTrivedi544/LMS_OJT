import { HttpError } from "../../errors/http-error.js";
import { hashPassword } from "../../security/password.js";
import type {
  CreateUserInput,
  ListUsersInput,
  UpdateUserInput,
} from "./users.schema.js";
import { UsersRepository, type UserRecord } from "./users.repository.js";

type ActorContext = {
  actorId: string;
  ipAddress?: string;
  userAgent?: string;
};

const toUserResponse = (user: UserRecord) => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  status: user.status,
  isActive: user.isActive,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
  deletedAt: user.deletedAt?.toISOString() ?? null,
});

export class UsersService {
  constructor(private readonly repository = new UsersRepository()) {}

  async listUsers(input: ListUsersInput) {
    const users = await this.repository.list(input);

    return users.map(toUserResponse);
  }

  async createUser(input: CreateUserInput, context: ActorContext) {
    const existingUser = await this.repository.findByEmail(input.email);

    if (existingUser) {
      throw new HttpError(409, "user_email_exists", "A user with this email already exists.");
    }

    const user = await this.repository.create({
      email: input.email,
      fullName: input.fullName,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      status: input.status,
      actorId: context.actorId,
    });

    if (!user) {
      throw new HttpError(500, "user_create_failed", "Failed to create user.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "user.created",
      entityType: "user",
      entityId: user.id,
      newValue: toUserResponse(user),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return toUserResponse(user);
  }

  async updateUser(id: string, input: UpdateUserInput, context: ActorContext) {
    const existingUser = await this.repository.findById(id);

    if (!existingUser) {
      throw new HttpError(404, "user_not_found", "User not found.");
    }

    if (id === context.actorId && (input.role || input.status)) {
      throw new HttpError(
        400,
        "cannot_change_own_access",
        "You cannot change your own role or status.",
      );
    }

    const updatedUser = await this.repository.update(id, {
      fullName: input.fullName,
      passwordHash: input.password ? await hashPassword(input.password) : undefined,
      role: input.role,
      status: input.status,
      actorId: context.actorId,
    });

    if (!updatedUser) {
      throw new HttpError(404, "user_not_found", "User not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "user.updated",
      entityType: "user",
      entityId: id,
      oldValue: toUserResponse(existingUser),
      newValue: toUserResponse(updatedUser),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return toUserResponse(updatedUser);
  }

  async archiveUser(id: string, context: ActorContext) {
    if (id === context.actorId) {
      throw new HttpError(400, "cannot_archive_self", "You cannot archive yourself.");
    }

    const existingUser = await this.repository.findById(id);

    if (!existingUser) {
      throw new HttpError(404, "user_not_found", "User not found.");
    }

    const archivedUser = await this.repository.archive(id, context.actorId);

    if (!archivedUser) {
      throw new HttpError(404, "user_not_found", "User not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "user.archived",
      entityType: "user",
      entityId: id,
      oldValue: toUserResponse(existingUser),
      newValue: toUserResponse(archivedUser),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return toUserResponse(archivedUser);
  }

  async restoreUser(id: string, context: ActorContext) {
    const existingUser = await this.repository.findById(id, true);

    if (!existingUser) {
      throw new HttpError(404, "user_not_found", "User not found.");
    }

    const restoredUser = await this.repository.restore(id, context.actorId);

    if (!restoredUser) {
      throw new HttpError(404, "user_not_found", "User not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "user.restored",
      entityType: "user",
      entityId: id,
      oldValue: toUserResponse(existingUser),
      newValue: toUserResponse(restoredUser),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return toUserResponse(restoredUser);
  }
}
