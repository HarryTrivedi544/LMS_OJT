import type {
  AuthTokens,
  AuthUser,
  UserManagementUser,
} from "@lms/api-contracts";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type ApiSuccess<TData> = {
  success: true;
  data: TData;
};

type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

const request = async <TData>(
  path: string,
  options: RequestInit = {},
): Promise<TData> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const payload = (await response.json()) as ApiSuccess<TData> | ApiError;

  if (!response.ok || !payload.success) {
    const message = payload.success ? "Request failed." : payload.error.message;
    throw new Error(message);
  }

  return payload.data;
};

export const login = (email: string, password: string) =>
  request<AuthTokens>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const refreshSession = () =>
  request<AuthTokens>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({}),
  });

export const logout = () =>
  request<{ revoked: boolean }>("/api/v1/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });

export const getCurrentUser = (accessToken: string) =>
  request<AuthUser & { status: string }>("/api/v1/auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const listUsers = (accessToken: string) =>
  request<UserManagementUser[]>("/api/v1/users", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const createUser = (
  accessToken: string,
  input: {
    email: string;
    fullName: string;
    role: string;
    status: string;
    password: string;
  },
) =>
  request<UserManagementUser>("/api/v1/users", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

export const archiveUser = (accessToken: string, userId: string) =>
  request<UserManagementUser>(`/api/v1/users/${userId}/archive`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const restoreUser = (accessToken: string, userId: string) =>
  request<UserManagementUser>(`/api/v1/users/${userId}/restore`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
