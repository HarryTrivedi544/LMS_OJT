import jwt, { type SignOptions } from "jsonwebtoken";

import { env } from "../config/env.js";

export type AccessTokenPayload = {
  sub: string;
  role: string;
  email: string;
};

export const signAccessToken = (payload: AccessTokenPayload) => {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
};

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
