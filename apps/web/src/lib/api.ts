import type {
  Assignment,
  AuthTokens,
  AuthUser,
  Batch,
  Candidate,
  CandidateLog,
  CandidateLogEntry,
  CandidateOptions,
  Program,
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

export const listPrograms = (accessToken: string) =>
  request<Program[]>("/api/v1/programs?includeArchived=true", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const createProgram = (
  accessToken: string,
  input: {
    name: string;
    code: string;
    status: string;
  },
) =>
  request<Program>("/api/v1/programs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

export const archiveProgram = (accessToken: string, programId: string) =>
  request<Program>(`/api/v1/programs/${programId}/archive`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const restoreProgram = (accessToken: string, programId: string) =>
  request<Program>(`/api/v1/programs/${programId}/restore`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const listBatches = (accessToken: string, programId: string) =>
  request<Batch[]>(`/api/v1/programs/${programId}/batches?includeArchived=true`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const createBatch = (
  accessToken: string,
  programId: string,
  input: {
    name: string;
    code: string;
    status: string;
  },
) =>
  request<Batch>(`/api/v1/programs/${programId}/batches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

export const archiveBatch = (accessToken: string, batchId: string) =>
  request<Batch>(`/api/v1/programs/batches/${batchId}/archive`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const restoreBatch = (accessToken: string, batchId: string) =>
  request<Batch>(`/api/v1/programs/batches/${batchId}/restore`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const listProgramAssignments = (accessToken: string, programId: string) =>
  request<Assignment[]>(`/api/v1/programs/${programId}/assignments`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const assignProgramAdmin = (
  accessToken: string,
  programId: string,
  userId: string,
) =>
  request<Assignment>(`/api/v1/programs/${programId}/assignments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ userId, role: "Program Admin" }),
  });

export const listBatchAssignments = (accessToken: string, batchId: string) =>
  request<Assignment[]>(`/api/v1/programs/batches/${batchId}/assignments`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const assignProgramLead = (
  accessToken: string,
  batchId: string,
  userId: string,
) =>
  request<Assignment>(`/api/v1/programs/batches/${batchId}/assignments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ userId, role: "Program Lead" }),
  });

export const listCandidateOptions = (accessToken: string) =>
  request<CandidateOptions>("/api/v1/candidates/options", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

const toQueryString = (input: Record<string, string | undefined>) => {
  const params = new URLSearchParams();

  Object.entries(input).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();

  return query ? `?${query}` : "";
};

export const listCandidates = (
  accessToken: string,
  filters: {
    programId?: string;
    batchId?: string;
    status?: string;
    search?: string;
  } = {},
) =>
  request<Candidate[]>(
    `/api/v1/candidates${toQueryString({
      includeArchived: "true",
      programId: filters.programId,
      batchId: filters.batchId,
      status: filters.status,
      search: filters.search,
    })}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

export const listCandidateLogs = (
  accessToken: string,
  filters: {
    candidateId?: string;
    status?: string;
    logDate?: string;
  } = {},
) =>
  request<CandidateLog[]>(
    `/api/v1/candidate-logs${toQueryString({
      includeArchived: "true",
      candidateId: filters.candidateId,
      status: filters.status,
      logDate: filters.logDate,
    })}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

export const createCandidateLog = (
  accessToken: string,
  input: {
    candidateId?: string;
    logDate: string;
    entries: Array<Omit<CandidateLogEntry, "hours">>;
  },
) =>
  request<CandidateLog>("/api/v1/candidate-logs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

export const reviewCandidateLog = (
  accessToken: string,
  logId: string,
  input: {
    status: string;
    reviewNote?: string;
  },
) =>
  request<CandidateLog>(`/api/v1/candidate-logs/${logId}/review`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

export const createCandidate = (
  accessToken: string,
  input: {
    fullName: string;
    email: string;
    password: string;
    candidateCode: string;
    programId: string;
    batchId?: string;
    status: string;
  },
) =>
  request<Candidate>("/api/v1/candidates", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

export const archiveCandidate = (accessToken: string, candidateId: string) =>
  request<Candidate>(`/api/v1/candidates/${candidateId}/archive`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const restoreCandidate = (accessToken: string, candidateId: string) =>
  request<Candidate>(`/api/v1/candidates/${candidateId}/restore`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
