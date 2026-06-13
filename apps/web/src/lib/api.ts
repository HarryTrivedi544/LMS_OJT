import type {
  Assignment,
  AuthTokens,
  AuthUser,
  Batch,
  Call,
  ChatMessage,
  ChatRoom,
  Candidate,
  CandidateLog,
  CandidateLogEntry,
  CandidateOptions,
  Program,
  ReportsOverview,
  KpiFeeRecommendation,
  KpiReview,
  KpiScoreEntry,
  QuarterlyKpiSummary,
  Notification,
  NotificationPreferences,
  PhasePromotionChecklistItem,
  PhasePromotionLeadRecommendation,
  PhasePromotionProgramAdminDecision,
  PhasePromotionReview,
  PhasePromotionSuperAdminDecision,
  StoredFile,
  TaskBrief,
  Timesheet,
  TimesheetEntry,
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

export const listTimesheets = (
  accessToken: string,
  filters: {
    programId?: string;
    batchId?: string;
    candidateId?: string;
    status?: string;
    weekStartDate?: string;
  } = {},
) =>
  request<Timesheet[]>(
    `/api/v1/timesheets${toQueryString({
      includeArchived: "true",
      programId: filters.programId,
      batchId: filters.batchId,
      candidateId: filters.candidateId,
      status: filters.status,
      weekStartDate: filters.weekStartDate,
    })}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

export const createTimesheet = (
  accessToken: string,
  input: {
    candidateId?: string;
    weekStartDate: string;
    weekEndDate: string;
    entries: Array<Omit<TimesheetEntry, "minutes">>;
  },
) =>
  request<Timesheet>("/api/v1/timesheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

export const updateTimesheet = (
  accessToken: string,
  timesheetId: string,
  input: {
    entries: Array<Omit<TimesheetEntry, "minutes">>;
  },
) =>
  request<Timesheet>(`/api/v1/timesheets/${timesheetId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

export const reviewTimesheet = (
  accessToken: string,
  timesheetId: string,
  input: {
    status: string;
    reviewNote?: string;
  },
) =>
  request<Timesheet>(`/api/v1/timesheets/${timesheetId}/review`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

export const listTaskBriefs = (
  accessToken: string,
  filters: {
    programId?: string;
    batchId?: string;
    candidateId?: string;
    status?: string;
  } = {},
) =>
  request<TaskBrief[]>(
    `/api/v1/task-briefs${toQueryString({
      includeArchived: "true",
      programId: filters.programId,
      batchId: filters.batchId,
      candidateId: filters.candidateId,
      status: filters.status,
    })}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

export const createTaskBrief = (
  accessToken: string,
  input: {
    candidateId: string;
    title: string;
    description: string;
    taskReference?: string;
    priority?: "low" | "medium" | "high";
    dueDate?: string;
  },
) =>
  request<TaskBrief>("/api/v1/task-briefs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

export const acknowledgeTaskBrief = (accessToken: string, taskBriefId: string) =>
  request<TaskBrief>(`/api/v1/task-briefs/${taskBriefId}/acknowledge`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const submitTaskBrief = (
  accessToken: string,
  taskBriefId: string,
  input: {
    submissionSummary: string;
    submissionDeliverables?: string;
  },
) =>
  request<TaskBrief>(`/api/v1/task-briefs/${taskBriefId}/submit`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

export const reviewTaskBrief = (
  accessToken: string,
  taskBriefId: string,
  input: {
    status: string;
    reviewNote?: string;
  },
) =>
  request<TaskBrief>(`/api/v1/task-briefs/${taskBriefId}/review`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

export const listKpiReviews = (
  accessToken: string,
  filters: {
    programId?: string;
    batchId?: string;
    candidateId?: string;
    status?: string;
    reviewPeriod?: string;
  } = {},
) =>
  request<KpiReview[]>(
    `/api/v1/kpi-reviews${toQueryString({
      includeArchived: "true",
      programId: filters.programId,
      batchId: filters.batchId,
      candidateId: filters.candidateId,
      status: filters.status,
      reviewPeriod: filters.reviewPeriod,
    })}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

export const createKpiReview = (
  accessToken: string,
  input: {
    candidateId: string;
    reviewPeriod: string;
    reviewDate: string;
    currentPhase: string;
    currentDesignation: string;
    programStartDate?: string;
    monthsInCurrentPhase?: number;
    attendanceSummary: {
      monthlyTargetHours: number;
      actualHoursLogged: number;
      workingDaysAvailable: number | null;
      daysAbsent: number;
      publicHolidays: number;
      nonAvailabilityDays: number;
      complianceStatus: "full_compliance" | "partial" | "non_compliant";
    };
    scores: KpiScoreEntry[];
    summary: {
      topStrengths: string[];
      improvementAreas: string[];
      notableAchievements?: string;
      qualityIssues?: string;
      feedbackResponse?: string;
      conductConcerns?: string;
    };
    improvementPlan: {
      pipConsideration: boolean;
      nextReviewDate?: string;
      directives: Array<{
        criterionKey: string;
        criterionLabel: string;
        directive: string;
        measurementDeadline: string;
      }>;
    };
    promotionSignal: {
      promotionWatch: boolean;
      readyForPromotion: boolean;
    };
    feeRecommendation?: KpiFeeRecommendation;
    feedback?: string;
  },
) =>
  request<KpiReview>("/api/v1/kpi-reviews", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

export const updateKpiReview = (
  accessToken: string,
  kpiReviewId: string,
  input: {
    reviewDate: string;
    currentPhase: string;
    currentDesignation: string;
    programStartDate?: string;
    monthsInCurrentPhase?: number;
    attendanceSummary: {
      monthlyTargetHours: number;
      actualHoursLogged: number;
      workingDaysAvailable: number | null;
      daysAbsent: number;
      publicHolidays: number;
      nonAvailabilityDays: number;
      complianceStatus: "full_compliance" | "partial" | "non_compliant";
    };
    scores: KpiScoreEntry[];
    summary: {
      topStrengths: string[];
      improvementAreas: string[];
      notableAchievements?: string;
      qualityIssues?: string;
      feedbackResponse?: string;
      conductConcerns?: string;
    };
    improvementPlan: {
      pipConsideration: boolean;
      nextReviewDate?: string;
      directives: Array<{
        criterionKey: string;
        criterionLabel: string;
        directive: string;
        measurementDeadline: string;
      }>;
    };
    promotionSignal: {
      promotionWatch: boolean;
      readyForPromotion: boolean;
    };
    feeRecommendation?: KpiFeeRecommendation;
    feedback?: string;
  },
) =>
  request<KpiReview>(`/api/v1/kpi-reviews/${kpiReviewId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

export const completeKpiReview = (accessToken: string, kpiReviewId: string) =>
  request<KpiReview>(`/api/v1/kpi-reviews/${kpiReviewId}/complete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const listQuarterlyKpiSummaries = (
  accessToken: string,
  filters: {
    programId?: string;
    batchId?: string;
    candidateId?: string;
    status?: string;
    reviewYear?: string;
    reviewQuarter?: string;
  } = {},
) =>
  request<QuarterlyKpiSummary[]>(
    `/api/v1/kpi-reviews/quarterly-summaries${toQueryString({
      includeArchived: "true",
      programId: filters.programId,
      batchId: filters.batchId,
      candidateId: filters.candidateId,
      status: filters.status,
      reviewYear: filters.reviewYear,
      reviewQuarter: filters.reviewQuarter,
    })}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

export const createQuarterlyKpiSummary = (
  accessToken: string,
  input: {
    candidateId: string;
    reviewYear: number;
    reviewQuarter: number;
    reviewDate: string;
    currentPhase: string;
    currentDesignation: string;
    assessment: {
      technicalGrowthSummary?: string;
      deliveryConsistencySummary?: string;
      communicationCollaborationSummary?: string;
      ownershipIndependenceSummary?: string;
      reviewResponsivenessSummary?: string;
      riskFlags?: string;
      strengths: string[];
      improvementPriorities: string[];
      recommendedFocus?: string;
    };
    actionPlan: {
      nextQuarterGoals?: string;
      expectedSkillImprovements?: string;
      expectedDeliveryImprovements?: string;
      supportRequired?: string;
      followUpDate?: string;
    };
    outcome?:
      | "on_track"
      | "on_track_with_support"
      | "needs_improvement_plan"
      | "promotion_track_candidate"
      | "not_ready_for_promotion_track";
    feedback?: string;
  },
) =>
  request<QuarterlyKpiSummary>("/api/v1/kpi-reviews/quarterly-summaries", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

export const updateQuarterlyKpiSummary = (
  accessToken: string,
  quarterlySummaryId: string,
  input: {
    reviewDate: string;
    currentPhase: string;
    currentDesignation: string;
    assessment: {
      technicalGrowthSummary?: string;
      deliveryConsistencySummary?: string;
      communicationCollaborationSummary?: string;
      ownershipIndependenceSummary?: string;
      reviewResponsivenessSummary?: string;
      riskFlags?: string;
      strengths: string[];
      improvementPriorities: string[];
      recommendedFocus?: string;
    };
    actionPlan: {
      nextQuarterGoals?: string;
      expectedSkillImprovements?: string;
      expectedDeliveryImprovements?: string;
      supportRequired?: string;
      followUpDate?: string;
    };
    outcome?:
      | "on_track"
      | "on_track_with_support"
      | "needs_improvement_plan"
      | "promotion_track_candidate"
      | "not_ready_for_promotion_track";
    feedback?: string;
  },
) =>
  request<QuarterlyKpiSummary>(
    `/api/v1/kpi-reviews/quarterly-summaries/${quarterlySummaryId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(input),
    },
  );

export const completeQuarterlyKpiSummary = (
  accessToken: string,
  quarterlySummaryId: string,
) =>
  request<QuarterlyKpiSummary>(
    `/api/v1/kpi-reviews/quarterly-summaries/${quarterlySummaryId}/complete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

export const listPhasePromotionReviews = (
  accessToken: string,
  filters: {
    programId?: string;
    batchId?: string;
    candidateId?: string;
    status?: string;
    caseType?: string;
  } = {},
) =>
  request<PhasePromotionReview[]>(
    `/api/v1/kpi-reviews/phase-promotions${toQueryString({
      includeArchived: "true",
      programId: filters.programId,
      batchId: filters.batchId,
      candidateId: filters.candidateId,
      status: filters.status,
      caseType: filters.caseType,
    })}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

export const createPhasePromotionReview = (
  accessToken: string,
  input: {
    candidateId: string;
    preparedDate: string;
    currentPhase: string;
    currentDesignation: string;
    proposedNextPhase: string;
    proposedNextDesignation: string;
    currentMonthlyFee?: number;
    proposedMonthlyFee?: number;
    currentPhaseStartDate?: string;
    monthsInCurrentPhase?: number;
    promotionEffectiveDate: string;
    promotionCycleType: string;
    caseType: "normal_eligibility" | "exception_case";
    exceptionReason?: string;
    evidence: {
      qualityReworkSummary?: string;
      leadReviewSummary?: string;
      keyProjectsCompleted: string[];
      skillsDemonstrated: string[];
      independentDeliveryEvidence?: string;
      mentoringLeadershipSignals?: string;
      repositoryLinks: string[];
      supportingFileIds: string[];
    };
    eligibilityChecklist: PhasePromotionChecklistItem[];
    leadRecommendation: {
      recommendation: PhasePromotionLeadRecommendation["recommendation"];
      summary?: string | null;
      conditions?: string | null;
      initialAssignmentNextPhase?: string | null;
    };
  },
) =>
  request<PhasePromotionReview>("/api/v1/kpi-reviews/phase-promotions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

export const updatePhasePromotionReview = (
  accessToken: string,
  reviewId: string,
  input: {
    preparedDate: string;
    currentPhase: string;
    currentDesignation: string;
    proposedNextPhase: string;
    proposedNextDesignation: string;
    currentMonthlyFee?: number;
    proposedMonthlyFee?: number;
    currentPhaseStartDate?: string;
    monthsInCurrentPhase?: number;
    promotionEffectiveDate: string;
    promotionCycleType: string;
    caseType: "normal_eligibility" | "exception_case";
    exceptionReason?: string;
    evidence: {
      qualityReworkSummary?: string;
      leadReviewSummary?: string;
      keyProjectsCompleted: string[];
      skillsDemonstrated: string[];
      independentDeliveryEvidence?: string;
      mentoringLeadershipSignals?: string;
      repositoryLinks: string[];
      supportingFileIds: string[];
    };
    eligibilityChecklist: PhasePromotionChecklistItem[];
    leadRecommendation: {
      recommendation: PhasePromotionLeadRecommendation["recommendation"];
      summary?: string | null;
      conditions?: string | null;
      initialAssignmentNextPhase?: string | null;
    };
  },
) =>
  request<PhasePromotionReview>(`/api/v1/kpi-reviews/phase-promotions/${reviewId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

export const submitPhasePromotionReview = (accessToken: string, reviewId: string) =>
  request<PhasePromotionReview>(`/api/v1/kpi-reviews/phase-promotions/${reviewId}/submit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const reviewPhasePromotionByProgramAdmin = (
  accessToken: string,
  reviewId: string,
  input: {
    decision: PhasePromotionProgramAdminDecision;
    note: string;
  },
) =>
  request<PhasePromotionReview>(
    `/api/v1/kpi-reviews/phase-promotions/${reviewId}/program-admin-review`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(input),
    },
  );

export const decidePhasePromotionBySuperAdmin = (
  accessToken: string,
  reviewId: string,
  input: {
    decision: PhasePromotionSuperAdminDecision;
    note: string;
  },
) =>
  request<PhasePromotionReview>(
    `/api/v1/kpi-reviews/phase-promotions/${reviewId}/super-admin-decision`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(input),
    },
  );

export const acknowledgePhasePromotionReview = (accessToken: string, reviewId: string) =>
  request<PhasePromotionReview>(`/api/v1/kpi-reviews/phase-promotions/${reviewId}/acknowledge`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const listFiles = (
  accessToken: string,
  filters: { module?: string; candidateId?: string } = {},
) =>
  request<StoredFile[]>(
    `/api/v1/files${toQueryString({
      module: filters.module,
      candidateId: filters.candidateId,
    })}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

export const listNotifications = (
  accessToken: string,
  filters: { unreadOnly?: boolean } = {},
) =>
  request<Notification[]>(
    `/api/v1/notifications${toQueryString({
      unreadOnly: filters.unreadOnly ? "true" : undefined,
    })}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

export const getUnreadNotificationCount = (accessToken: string) =>
  request<{ count: number }>("/api/v1/notifications/unread-count", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const markNotificationRead = (accessToken: string, notificationId: string) =>
  request<Notification>(`/api/v1/notifications/${notificationId}/read`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const markAllNotificationsRead = (accessToken: string) =>
  request<{ updated: boolean }>("/api/v1/notifications/read-all", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const getNotificationPreferences = (accessToken: string) =>
  request<NotificationPreferences>("/api/v1/notifications/preferences", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const updateNotificationPreferences = (
  accessToken: string,
  input: NotificationPreferences,
) =>
  request<NotificationPreferences>("/api/v1/notifications/preferences", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

export const listChatRooms = (
  accessToken: string,
  filters: { candidateId?: string } = {},
) =>
  request<ChatRoom[]>(
    `/api/v1/chat/rooms${toQueryString({ candidateId: filters.candidateId })}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

export const ensureChatRoom = (accessToken: string, candidateId: string) =>
  request<ChatRoom>("/api/v1/chat/rooms", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ candidateId }),
  });

export const listChatMessages = (accessToken: string, roomId: string) =>
  request<ChatMessage[]>(`/api/v1/chat/rooms/${roomId}/messages`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const sendChatMessage = (
  accessToken: string,
  roomId: string,
  body: string,
) =>
  request<ChatMessage>(`/api/v1/chat/rooms/${roomId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ body }),
  });

export const listCalls = (
  accessToken: string,
  filters: {
    programId?: string;
    batchId?: string;
    candidateId?: string;
    status?: string;
  } = {},
) =>
  request<Call[]>(
    `/api/v1/calls${toQueryString({
      includeArchived: "true",
      programId: filters.programId,
      batchId: filters.batchId,
      candidateId: filters.candidateId,
      status: filters.status,
    })}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

export const createCall = (
  accessToken: string,
  input: {
    candidateId: string;
    title: string;
    description?: string;
    scheduledStartAt: string;
    scheduledEndAt: string;
    meetingLink?: string;
  },
) =>
  request<Call>("/api/v1/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

export const getReportsOverview = (
  accessToken: string,
  filters: {
    programId?: string;
    batchId?: string;
    candidateId?: string;
  } = {},
) =>
  request<ReportsOverview>(
    `/api/v1/reports/overview${toQueryString({
      programId: filters.programId,
      batchId: filters.batchId,
      candidateId: filters.candidateId,
    })}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

export const updateCall = (
  accessToken: string,
  callId: string,
  input: {
    title?: string;
    description?: string;
    scheduledStartAt?: string;
    scheduledEndAt?: string;
    meetingLink?: string;
  },
) =>
  request<Call>(`/api/v1/calls/${callId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

export const cancelCall = (accessToken: string, callId: string) =>
  request<Call>(`/api/v1/calls/${callId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const uploadFile = (
  accessToken: string,
  input: { file: File; module: string; candidateId?: string },
) => {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("module", input.module);
  if (input.candidateId) {
    formData.append("candidateId", input.candidateId);
  }

  return fetch(`${apiBaseUrl}/api/v1/files/upload`, {
    method: "POST",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  }).then(async (response) => {
    const payload = (await response.json()) as
      | { success: true; data: StoredFile }
      | { success: false; error: { message: string } };

    if (!response.ok || !payload.success) {
      throw new Error(payload.success ? "Upload failed." : payload.error.message);
    }

    return payload.data;
  });
};

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
