import { HttpError } from "../../errors/http-error.js";
import {
  createRefreshToken,
  getRefreshTokenExpiry,
  hashRefreshToken,
} from "../../security/refresh-tokens.js";
import { signAccessToken } from "../../security/tokens.js";
import { verifyPassword } from "../../security/password.js";
import type { LoginInput, LogoutInput, RefreshInput } from "./auth.schema.js";
import { AuthRepository } from "./auth.repository.js";

type RequestContext = {
  ipAddress?: string;
  userAgent?: string;
};

export class AuthService {
  constructor(private readonly repository = new AuthRepository()) {}

  async login(input: LoginInput, context: RequestContext) {
    const user = await this.repository.findUserByEmail(input.email);

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new HttpError(401, "invalid_credentials", "Invalid email or password.");
    }

    if (!user.isActive || user.deletedAt || user.status !== "active") {
      throw new HttpError(403, "user_inactive", "This user cannot log in.");
    }

    const tokens = await this.issueTokens({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });

    await this.repository.audit({
      actorType: "user",
      actorId: user.id,
      action: "auth.login",
      entityType: "user",
      entityId: user.id,
      metadata: { role: user.role },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return tokens;
  }

  async refresh(input: RefreshInput) {
    const tokenHash = hashRefreshToken(input.refreshToken);
    const storedToken = await this.repository.findValidRefreshToken(tokenHash);

    if (!storedToken) {
      throw new HttpError(401, "invalid_refresh_token", "Refresh token is invalid.");
    }

    const user = await this.repository.findActiveUserById(storedToken.userId);

    if (!user) {
      throw new HttpError(401, "invalid_refresh_token", "Refresh token is invalid.");
    }

    await this.repository.revokeRefreshToken(tokenHash);

    return this.issueTokens(user);
  }

  async logout(input: LogoutInput, context: RequestContext) {
    const tokenHash = hashRefreshToken(input.refreshToken);
    const storedToken = await this.repository.findValidRefreshToken(tokenHash);

    await this.repository.revokeRefreshToken(tokenHash);

    if (storedToken) {
      await this.repository.audit({
        actorType: "user",
        actorId: storedToken.userId,
        action: "auth.logout",
        entityType: "user",
        entityId: storedToken.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    }

    return { revoked: true };
  }

  async getCurrentUser(userId: string) {
    const user = await this.repository.findActiveUserById(userId);

    if (!user) {
      throw new HttpError(401, "unauthenticated", "Authentication is required.");
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
    };
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  }) {
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = createRefreshToken();
    const expiresAt = getRefreshTokenExpiry();

    await this.repository.createRefreshToken({
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer" as const,
      expiresIn: "30m" as const,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }
}
