import crypto from "node:crypto";

import { env } from "../config/env.js";

const durationPattern = /^(\d+)(m|h|d)$/;

export const createRefreshToken = () => crypto.randomBytes(48).toString("base64url");

export const hashRefreshToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const getRefreshTokenExpiry = () => {
  const match = durationPattern.exec(env.JWT_REFRESH_EXPIRES_IN);

  if (!match) {
    throw new Error("JWT_REFRESH_EXPIRES_IN must use m, h, or d format.");
  }

  const amount = Number(match[1]);
  const unit = match[2] as "m" | "h" | "d";
  const multipliers = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(Date.now() + amount * multipliers[unit]);
};
