import { z } from "zod";

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export const apiSuccessSchema = <TData extends z.ZodType>(data: TData) =>
  z.object({
    success: z.literal(true),
    data,
  });

export const healthResponseSchema = apiSuccessSchema(
  z.object({
    service: z.literal("lms-api"),
    status: z.literal("ok"),
    timestamp: z.string(),
  }),
);

export const authUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  fullName: z.string(),
  role: z.enum(["Super Admin", "Program Admin", "Program Lead", "Candidate"]),
});

export const userManagementUserSchema = authUserSchema.extend({
  status: z.enum(["active", "inactive", "suspended", "archived"]),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

const workflowStatusSchema = z.enum([
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "revision_required",
  "overdue",
  "cancelled",
]);

export const programSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  status: workflowStatusSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const batchSchema = programSchema.extend({
  programId: z.string(),
});

export const assignmentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fullName: z.string(),
  email: z.email(),
  role: z.enum(["Program Admin", "Program Lead"]),
  createdAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const candidateSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fullName: z.string(),
  email: z.email(),
  programId: z.string(),
  programName: z.string(),
  programCode: z.string(),
  batchId: z.string().nullable(),
  batchName: z.string().nullable(),
  batchCode: z.string().nullable(),
  candidateCode: z.string(),
  currentPhase: z.string().nullable(),
  currentDesignation: z.string().nullable(),
  currentMonthlyFee: z.number().nullable(),
  currentPhaseStartDate: z.string().nullable(),
  status: z.enum(["active", "inactive", "suspended", "archived"]),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const candidateOptionsSchema = z.object({
  programs: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
    }),
  ),
  batches: z.array(
    z.object({
      id: z.string(),
      programId: z.string(),
      name: z.string(),
      code: z.string(),
    }),
  ),
});

export const candidateLogEntrySchema = z.object({
  taskReference: z.string(),
  taskDescription: z.string(),
  projectReference: z.string(),
  taskType: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  hours: z.number(),
  outputDelivered: z.string().optional(),
  toolTechnology: z.string(),
  status: z.string(),
  notesBlocker: z.string().optional(),
});

export const candidateLogSchema = z.object({
  id: z.string(),
  candidateId: z.string(),
  userId: z.string(),
  fullName: z.string(),
  email: z.email(),
  candidateCode: z.string(),
  programId: z.string(),
  programName: z.string(),
  batchId: z.string().nullable(),
  batchName: z.string().nullable(),
  logDate: z.string(),
  minutesSpent: z.number(),
  entries: z.array(candidateLogEntrySchema),
  summary: z.string(),
  blockers: z.string().nullable(),
  status: workflowStatusSchema,
  submittedAt: z.string(),
  reviewedAt: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  reviewNote: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const timesheetEntrySchema = z.object({
  workDate: z.string(),
  dayLabel: z.string(),
  hours: z.number(),
  minutes: z.number(),
  summary: z.string().optional(),
  blockers: z.string().optional(),
});

export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  body: z.string(),
  triggerName: z.string(),
  channel: z.enum(["email", "in_app", "push"]),
  readAt: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  emailSentAt: z.string().nullable(),
  createdAt: z.string(),
});

export const notificationPreferencesSchema = z.object({
  emailEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
});

export const chatRoomSchema = z.object({
  id: z.string(),
  candidateId: z.string(),
  userId: z.string(),
  fullName: z.string(),
  email: z.email(),
  candidateCode: z.string(),
  programId: z.string(),
  programName: z.string(),
  batchId: z.string().nullable(),
  batchName: z.string().nullable(),
  title: z.string(),
  lastMessageAt: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const chatMessageSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  senderUserId: z.string(),
  senderName: z.string(),
  body: z.string(),
  createdAt: z.string(),
});

export const callSchema = z.object({
  id: z.string(),
  candidateId: z.string(),
  userId: z.string(),
  fullName: z.string(),
  email: z.email(),
  candidateCode: z.string(),
  programId: z.string(),
  programName: z.string(),
  batchId: z.string().nullable(),
  batchName: z.string().nullable(),
  scheduledBy: z.string(),
  schedulerName: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  scheduledStartAt: z.string(),
  scheduledEndAt: z.string(),
  meetingLink: z.string().nullable(),
  status: workflowStatusSchema,
  cancelledAt: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const storedFileSchema = z.object({
  id: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  module: z.string(),
  ownerUserId: z.string(),
  candidateId: z.string().nullable(),
  isPrivate: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  downloadUrl: z.string().nullable(),
});

export const kpiScoreEntrySchema = z.object({
  key: z.string(),
  criterion: z.string(),
  score: z.number(),
  maxScore: z.number(),
  notes: z.string().optional(),
});

export const kpiAttendanceSummarySchema = z.object({
  monthlyTargetHours: z.number(),
  actualHoursLogged: z.number(),
  workingDaysAvailable: z.number().nullable(),
  daysAbsent: z.number(),
  publicHolidays: z.number(),
  nonAvailabilityDays: z.number(),
  complianceStatus: z.enum([
    "full_compliance",
    "partial",
    "non_compliant",
  ]),
  varianceHours: z.number(),
});

export const kpiReviewSummarySchema = z.object({
  overallRating: z.enum([
    "excellent",
    "good",
    "satisfactory",
    "below_standard",
  ]),
  topStrengths: z.array(z.string()),
  improvementAreas: z.array(z.string()),
  notableAchievements: z.string().nullable(),
  qualityIssues: z.string().nullable(),
  feedbackResponse: z.string().nullable(),
  conductConcerns: z.string().nullable(),
});

export const kpiImprovementDirectiveSchema = z.object({
  criterionKey: z.string(),
  criterionLabel: z.string(),
  directive: z.string(),
  measurementDeadline: z.string(),
});

export const kpiImprovementPlanSchema = z.object({
  improvementRequired: z.boolean(),
  directives: z.array(kpiImprovementDirectiveSchema),
  pipConsideration: z.boolean(),
  nextReviewDate: z.string().nullable(),
});

export const kpiPromotionSignalSchema = z.object({
  promotionWatch: z.boolean(),
  readyForPromotion: z.boolean(),
});

export const kpiFeeRecommendationSchema = z.object({
  decision: z.enum(["maintain", "increment", "hold"]),
  incrementAmount: z.number().nullable(),
  justification: z.string().nullable(),
});

export const evidenceLinkRefSchema = z.object({
  entityType: z.enum([
    "candidate_log",
    "timesheet",
    "task_brief",
    "file",
    "call",
    "kpi_review",
    "quarterly_kpi_summary",
  ]),
  entityId: z.string(),
  label: z.string(),
  status: z.string().nullable(),
  occurredAt: z.string().nullable(),
  summary: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const linkedEvidenceSchema = z.object({
  dailyLogs: z.array(evidenceLinkRefSchema),
  timesheets: z.array(evidenceLinkRefSchema),
  taskBriefs: z.array(evidenceLinkRefSchema),
  files: z.array(evidenceLinkRefSchema),
  calls: z.array(evidenceLinkRefSchema),
  kpiReviews: z.array(evidenceLinkRefSchema),
  quarterlySummaries: z.array(evidenceLinkRefSchema),
});

export const quarterlyKpiMonthlyAverageSchema = z.object({
  reviewPeriod: z.string(),
  overallScore: z.number(),
});

export const quarterlyKpiLinkedMonthlyReviewSchema = z.object({
  id: z.string(),
  reviewPeriod: z.string(),
  overallScore: z.number(),
  status: z.string(),
});

export const quarterlyKpiWorkflowSummariesSchema = z.object({
  timesheetSubmissionSummary: z.string().nullable(),
  dailyLogConsistencySummary: z.string().nullable(),
  taskCompletionSummary: z.string().nullable(),
  callEngagementSummary: z.string().nullable(),
});

export const quarterlyKpiRollupSchema = z.object({
  monthlyAverageScores: z.array(quarterlyKpiMonthlyAverageSchema),
  quarterlyAverageScore: z.number().nullable(),
  totalQuarterlyHours: z.number(),
  averageMonthlyHours: z.number(),
  timesheetCount: z.number(),
  approvedTimesheetCount: z.number(),
  dailyLogCount: z.number(),
  approvedDailyLogCount: z.number(),
  taskAssignedCount: z.number(),
  taskApprovedCount: z.number(),
  taskRevisionCount: z.number(),
  callCount: z.number(),
  cancelledCallCount: z.number(),
  linkedMonthlyKpiReviews: z.array(quarterlyKpiLinkedMonthlyReviewSchema),
  workflowSummaries: quarterlyKpiWorkflowSummariesSchema,
});

export const quarterlyKpiAssessmentSchema = z.object({
  technicalGrowthSummary: z.string().nullable(),
  deliveryConsistencySummary: z.string().nullable(),
  communicationCollaborationSummary: z.string().nullable(),
  ownershipIndependenceSummary: z.string().nullable(),
  reviewResponsivenessSummary: z.string().nullable(),
  riskFlags: z.string().nullable(),
  strengths: z.array(z.string()),
  improvementPriorities: z.array(z.string()),
  recommendedFocus: z.string().nullable(),
});

export const quarterlyKpiActionPlanSchema = z.object({
  nextQuarterGoals: z.string().nullable(),
  expectedSkillImprovements: z.string().nullable(),
  expectedDeliveryImprovements: z.string().nullable(),
  supportRequired: z.string().nullable(),
  followUpDate: z.string().nullable(),
});

export const quarterlyKpiOutcomeSchema = z.enum([
  "on_track",
  "on_track_with_support",
  "needs_improvement_plan",
  "promotion_track_candidate",
  "not_ready_for_promotion_track",
]);

export const kpiReviewSchema = z.object({
  id: z.string(),
  candidateId: z.string(),
  userId: z.string(),
  fullName: z.string(),
  email: z.email(),
  candidateCode: z.string(),
  programId: z.string(),
  programName: z.string(),
  batchId: z.string().nullable(),
  batchName: z.string().nullable(),
  reviewerId: z.string(),
  reviewerName: z.string(),
  reviewPeriod: z.string(),
  reviewDate: z.string().nullable(),
  currentPhase: z.string().nullable(),
  currentDesignation: z.string().nullable(),
  programStartDate: z.string().nullable(),
  monthsInCurrentPhase: z.number().nullable(),
  attendanceSummary: kpiAttendanceSummarySchema,
  scores: z.array(kpiScoreEntrySchema),
  overallScore: z.number().nullable(),
  summary: kpiReviewSummarySchema,
  improvementPlan: kpiImprovementPlanSchema,
  promotionSignal: kpiPromotionSignalSchema,
  feeRecommendation: kpiFeeRecommendationSchema.nullable(),
  feedback: z.string().nullable(),
  status: workflowStatusSchema,
  completedAt: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  reviewNote: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  linkedEvidence: linkedEvidenceSchema,
});

export const quarterlyKpiSummarySchema = z.object({
  id: z.string(),
  candidateId: z.string(),
  userId: z.string(),
  fullName: z.string(),
  email: z.email(),
  candidateCode: z.string(),
  programId: z.string(),
  programName: z.string(),
  batchId: z.string().nullable(),
  batchName: z.string().nullable(),
  reviewerId: z.string(),
  reviewerName: z.string(),
  reviewYear: z.number(),
  reviewQuarter: z.number(),
  reviewDate: z.string().nullable(),
  reviewPeriodStart: z.string(),
  reviewPeriodEnd: z.string(),
  currentPhase: z.string().nullable(),
  currentDesignation: z.string().nullable(),
  rollup: quarterlyKpiRollupSchema,
  assessment: quarterlyKpiAssessmentSchema,
  actionPlan: quarterlyKpiActionPlanSchema,
  outcome: quarterlyKpiOutcomeSchema.nullable(),
  feedback: z.string().nullable(),
  status: workflowStatusSchema,
  completedAt: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  reviewNote: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  linkedEvidence: linkedEvidenceSchema,
});

export const phasePromotionCaseTypeSchema = z.enum([
  "normal_eligibility",
  "exception_case",
]);

export const phasePromotionChecklistItemSchema = z.object({
  criterionKey: z.string(),
  criterionLabel: z.string(),
  isMet: z.boolean(),
  evidence: z.string().nullable(),
});

export const phasePromotionEvidenceMonthlyAverageSchema = z.object({
  kpiReviewId: z.string().nullable(),
  reviewPeriod: z.string(),
  overallScore: z.number(),
});

export const phasePromotionHoursComplianceTrendSchema = z.object({
  reviewPeriod: z.string(),
  monthlyTargetHours: z.number(),
  actualHoursLogged: z.number(),
  complianceStatus: z.string(),
});

export const phasePromotionTaskTrendSchema = z.object({
  reviewPeriod: z.string(),
  approvedCount: z.number(),
  revisionCount: z.number(),
  totalCount: z.number(),
});

export const phasePromotionRelatedQuarterlySummarySchema = z.object({
  id: z.string(),
  reviewYear: z.number(),
  reviewQuarter: z.number(),
  quarterlyAverageScore: z.number().nullable(),
  status: z.string(),
});

export const phasePromotionEvidenceSchema = z.object({
  recentMonthlyKpiAverages: z.array(phasePromotionEvidenceMonthlyAverageSchema),
  overallRecentAverage: z.number().nullable(),
  hoursComplianceSummary: z.string().nullable(),
  hoursComplianceTrend: z.array(phasePromotionHoursComplianceTrendSchema),
  taskCompletionSummary: z.string().nullable(),
  taskApprovalTrend: z.array(phasePromotionTaskTrendSchema),
  relatedQuarterlySummary: phasePromotionRelatedQuarterlySummarySchema.nullable(),
  qualityReworkSummary: z.string().nullable(),
  leadReviewSummary: z.string().nullable(),
  keyProjectsCompleted: z.array(z.string()),
  skillsDemonstrated: z.array(z.string()),
  independentDeliveryEvidence: z.string().nullable(),
  mentoringLeadershipSignals: z.string().nullable(),
  repositoryLinks: z.array(z.string()),
  supportingFileIds: z.array(z.string()),
});

export const phasePromotionLeadRecommendationSchema = z.object({
  recommendation: z.enum(["promote", "promote_with_conditions", "hold"]),
  summary: z.string().nullable(),
  conditions: z.string().nullable(),
  initialAssignmentNextPhase: z.string().nullable(),
});

export const phasePromotionProgramAdminDecisionSchema = z.enum([
  "recommend_approval",
  "recommend_rejection",
  "revision_required",
]);

export const phasePromotionProgramAdminReviewSchema = z.object({
  decision: phasePromotionProgramAdminDecisionSchema.nullable(),
  note: z.string().nullable(),
});

export const phasePromotionSuperAdminDecisionSchema = z.enum([
  "approved",
  "rejected",
  "revision_required",
]);

export const phasePromotionSuperAdminReviewSchema = z.object({
  decision: phasePromotionSuperAdminDecisionSchema.nullable(),
  note: z.string().nullable(),
});

export const phasePromotionReviewSchema = z.object({
  id: z.string(),
  candidateId: z.string(),
  userId: z.string(),
  fullName: z.string(),
  email: z.email(),
  candidateCode: z.string(),
  programId: z.string(),
  programName: z.string(),
  batchId: z.string().nullable(),
  batchName: z.string().nullable(),
  preparedBy: z.string(),
  preparedByName: z.string(),
  preparedDate: z.string(),
  currentPhase: z.string(),
  currentDesignation: z.string(),
  proposedNextPhase: z.string(),
  proposedNextDesignation: z.string(),
  currentMonthlyFee: z.number().nullable(),
  proposedMonthlyFee: z.number().nullable(),
  currentPhaseStartDate: z.string().nullable(),
  monthsInCurrentPhase: z.number().nullable(),
  promotionEffectiveDate: z.string(),
  promotionCycleType: z.string(),
  caseType: phasePromotionCaseTypeSchema,
  exceptionReason: z.string().nullable(),
  evidence: phasePromotionEvidenceSchema,
  eligibilityChecklist: z.array(phasePromotionChecklistItemSchema),
  leadRecommendation: phasePromotionLeadRecommendationSchema,
  programAdminReview: phasePromotionProgramAdminReviewSchema,
  superAdminDecision: phasePromotionSuperAdminReviewSchema,
  candidateAcknowledgedAt: z.string().nullable(),
  candidateAcknowledgedBy: z.string().nullable(),
  status: workflowStatusSchema,
  submittedAt: z.string().nullable(),
  programAdminReviewedAt: z.string().nullable(),
  programAdminReviewedBy: z.string().nullable(),
  superAdminReviewedAt: z.string().nullable(),
  superAdminReviewedBy: z.string().nullable(),
  reviewNote: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  linkedEvidence: linkedEvidenceSchema,
});

export const reportsFilterSchema = z.object({
  programId: z.string().nullable(),
  batchId: z.string().nullable(),
  candidateId: z.string().nullable(),
});

export const reportsOverviewSummarySchema = z.object({
  candidateCount: z.number(),
  activeCandidateCount: z.number(),
  completedMonthlyKpiCount: z.number(),
  completedQuarterlySummaryCount: z.number(),
  activePromotionReviewCount: z.number(),
  approvedPromotionCount: z.number(),
  overallAverageMonthlyKpiScore: z.number().nullable(),
  overallAverageQuarterlyKpiScore: z.number().nullable(),
});

export const candidateProgressReportRowSchema = z.object({
  candidateId: z.string(),
  userId: z.string(),
  fullName: z.string(),
  candidateCode: z.string(),
  programId: z.string(),
  programName: z.string(),
  batchId: z.string().nullable(),
  batchName: z.string().nullable(),
  currentPhase: z.string().nullable(),
  currentDesignation: z.string().nullable(),
  monthlyKpiAverage: z.number().nullable(),
  latestMonthlyReviewPeriod: z.string().nullable(),
  latestMonthlyScore: z.number().nullable(),
  latestQuarterlyLabel: z.string().nullable(),
  latestQuarterlyAverage: z.number().nullable(),
  latestQuarterlyOutcome: z.string().nullable(),
  totalLoggedHours: z.number(),
  dailyLogCount: z.number(),
  approvedDailyLogCount: z.number(),
  timesheetCount: z.number(),
  approvedTimesheetCount: z.number(),
  taskAssignedCount: z.number(),
  taskApprovedCount: z.number(),
  taskRevisionCount: z.number(),
  callCount: z.number(),
  cancelledCallCount: z.number(),
  activePromotionStatus: z.string().nullable(),
});

export const scopePerformanceReportRowSchema = z.object({
  scopeType: z.enum(["program", "batch"]),
  scopeId: z.string(),
  scopeName: z.string(),
  programId: z.string(),
  programName: z.string(),
  candidateCount: z.number(),
  activeCandidateCount: z.number(),
  averageMonthlyKpiScore: z.number().nullable(),
  averageQuarterlyKpiScore: z.number().nullable(),
  dailyLogApprovalRate: z.number().nullable(),
  timesheetApprovalRate: z.number().nullable(),
  taskApprovalRate: z.number().nullable(),
  promotionReadyCount: z.number(),
  revisionRequiredCount: z.number(),
});

export const monthlyKpiReportRowSchema = z.object({
  reviewId: z.string(),
  candidateId: z.string(),
  fullName: z.string(),
  candidateCode: z.string(),
  programName: z.string(),
  batchName: z.string().nullable(),
  reviewPeriod: z.string(),
  overallScore: z.number().nullable(),
  status: z.string(),
  overallRating: z.string().nullable(),
  improvementRequired: z.boolean(),
  promotionWatch: z.boolean(),
  readyForPromotion: z.boolean(),
  completedAt: z.string().nullable(),
});

export const quarterlyKpiReportRowSchema = z.object({
  summaryId: z.string(),
  candidateId: z.string(),
  fullName: z.string(),
  candidateCode: z.string(),
  programName: z.string(),
  batchName: z.string().nullable(),
  reviewYear: z.number(),
  reviewQuarter: z.number(),
  quarterlyAverageScore: z.number().nullable(),
  outcome: z.string().nullable(),
  status: z.string(),
  totalQuarterlyHours: z.number(),
  completedAt: z.string().nullable(),
});

export const phasePromotionPipelineSummarySchema = z.object({
  draft: z.number(),
  submitted: z.number(),
  underReview: z.number(),
  revisionRequired: z.number(),
  approved: z.number(),
  rejected: z.number(),
});

export const phasePromotionPipelineRowSchema = z.object({
  reviewId: z.string(),
  candidateId: z.string(),
  fullName: z.string(),
  candidateCode: z.string(),
  programName: z.string(),
  batchName: z.string().nullable(),
  currentPhase: z.string(),
  proposedNextPhase: z.string(),
  proposedNextDesignation: z.string(),
  promotionEffectiveDate: z.string(),
  preparedDate: z.string(),
  status: z.string(),
  programAdminDecision: z.string().nullable(),
  superAdminDecision: z.string().nullable(),
  candidateAcknowledgedAt: z.string().nullable(),
});

export const submissionComplianceReportRowSchema = z.object({
  candidateId: z.string(),
  fullName: z.string(),
  candidateCode: z.string(),
  programName: z.string(),
  batchName: z.string().nullable(),
  dailyLogSubmittedCount: z.number(),
  dailyLogApprovedCount: z.number(),
  timesheetSubmittedCount: z.number(),
  timesheetApprovedCount: z.number(),
  taskAssignedCount: z.number(),
  taskApprovedCount: z.number(),
  taskRevisionCount: z.number(),
  dailyLogApprovalRate: z.number().nullable(),
  timesheetApprovalRate: z.number().nullable(),
  taskApprovalRate: z.number().nullable(),
});

export const reportsOverviewSchema = z.object({
  filters: reportsFilterSchema,
  summary: reportsOverviewSummarySchema,
  candidateProgress: z.array(candidateProgressReportRowSchema),
  scopePerformance: z.array(scopePerformanceReportRowSchema),
  monthlyKpi: z.array(monthlyKpiReportRowSchema),
  quarterlyKpi: z.array(quarterlyKpiReportRowSchema),
  promotionPipeline: z.object({
    summary: phasePromotionPipelineSummarySchema,
    records: z.array(phasePromotionPipelineRowSchema),
  }),
  submissionCompliance: z.array(submissionComplianceReportRowSchema),
});

export const taskBriefSchema = z.object({
  id: z.string(),
  candidateId: z.string(),
  userId: z.string(),
  fullName: z.string(),
  email: z.email(),
  candidateCode: z.string(),
  programId: z.string(),
  programName: z.string(),
  batchId: z.string().nullable(),
  batchName: z.string().nullable(),
  assignedBy: z.string(),
  assignedByName: z.string(),
  title: z.string(),
  description: z.string(),
  taskReference: z.string().nullable(),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string().nullable(),
  status: workflowStatusSchema,
  acknowledgedAt: z.string().nullable(),
  submissionSummary: z.string().nullable(),
  submissionDeliverables: z.string().nullable(),
  submittedAt: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  reviewNote: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const timesheetSchema = z.object({
  id: z.string(),
  candidateId: z.string(),
  userId: z.string(),
  fullName: z.string(),
  email: z.email(),
  candidateCode: z.string(),
  programId: z.string(),
  programName: z.string(),
  batchId: z.string().nullable(),
  batchName: z.string().nullable(),
  weekStartDate: z.string(),
  weekEndDate: z.string(),
  totalMinutes: z.number(),
  entries: z.array(timesheetEntrySchema),
  status: workflowStatusSchema,
  submittedAt: z.string(),
  reviewedAt: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  reviewNote: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  tokenType: z.literal("Bearer"),
  expiresIn: z.literal("30m"),
  refreshTokenExpiresAt: z.string(),
  user: authUserSchema,
});

export const loginResponseSchema = apiSuccessSchema(authTokensSchema);
export const refreshResponseSchema = apiSuccessSchema(authTokensSchema);
export const listUsersResponseSchema = apiSuccessSchema(
  z.array(userManagementUserSchema),
);
export const userResponseSchema = apiSuccessSchema(userManagementUserSchema);
export const listProgramsResponseSchema = apiSuccessSchema(z.array(programSchema));
export const programResponseSchema = apiSuccessSchema(programSchema);
export const listBatchesResponseSchema = apiSuccessSchema(z.array(batchSchema));
export const batchResponseSchema = apiSuccessSchema(batchSchema);
export const listAssignmentsResponseSchema = apiSuccessSchema(
  z.array(assignmentSchema),
);
export const assignmentResponseSchema = apiSuccessSchema(assignmentSchema);
export const listCandidatesResponseSchema = apiSuccessSchema(
  z.array(candidateSchema),
);
export const candidateResponseSchema = apiSuccessSchema(candidateSchema);
export const candidateOptionsResponseSchema = apiSuccessSchema(
  candidateOptionsSchema,
);
export const listCandidateLogsResponseSchema = apiSuccessSchema(
  z.array(candidateLogSchema),
);
export const candidateLogResponseSchema = apiSuccessSchema(candidateLogSchema);
export const listTimesheetsResponseSchema = apiSuccessSchema(
  z.array(timesheetSchema),
);
export const timesheetResponseSchema = apiSuccessSchema(timesheetSchema);
export const listTaskBriefsResponseSchema = apiSuccessSchema(
  z.array(taskBriefSchema),
);
export const taskBriefResponseSchema = apiSuccessSchema(taskBriefSchema);
export const listKpiReviewsResponseSchema = apiSuccessSchema(
  z.array(kpiReviewSchema),
);
export const kpiReviewResponseSchema = apiSuccessSchema(kpiReviewSchema);
export const listQuarterlyKpiSummariesResponseSchema = apiSuccessSchema(
  z.array(quarterlyKpiSummarySchema),
);
export const quarterlyKpiSummaryResponseSchema = apiSuccessSchema(
  quarterlyKpiSummarySchema,
);
export const listPhasePromotionReviewsResponseSchema = apiSuccessSchema(
  z.array(phasePromotionReviewSchema),
);
export const phasePromotionReviewResponseSchema = apiSuccessSchema(
  phasePromotionReviewSchema,
);
export const listStoredFilesResponseSchema = apiSuccessSchema(
  z.array(storedFileSchema),
);
export const storedFileResponseSchema = apiSuccessSchema(storedFileSchema);
export const listNotificationsResponseSchema = apiSuccessSchema(
  z.array(notificationSchema),
);
export const notificationResponseSchema = apiSuccessSchema(notificationSchema);
export const unreadCountResponseSchema = apiSuccessSchema(
  z.object({ count: z.number() }),
);
export const notificationPreferencesResponseSchema = apiSuccessSchema(
  notificationPreferencesSchema,
);
export const listChatRoomsResponseSchema = apiSuccessSchema(z.array(chatRoomSchema));
export const chatRoomResponseSchema = apiSuccessSchema(chatRoomSchema);
export const listChatMessagesResponseSchema = apiSuccessSchema(
  z.array(chatMessageSchema),
);
export const chatMessageResponseSchema = apiSuccessSchema(chatMessageSchema);
export const listCallsResponseSchema = apiSuccessSchema(z.array(callSchema));
export const callResponseSchema = apiSuccessSchema(callSchema);
export const reportsOverviewResponseSchema = apiSuccessSchema(reportsOverviewSchema);

export type ApiError = z.infer<typeof apiErrorSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type UserManagementUser = z.infer<typeof userManagementUserSchema>;
export type Program = z.infer<typeof programSchema>;
export type Batch = z.infer<typeof batchSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type Candidate = z.infer<typeof candidateSchema>;
export type CandidateOptions = z.infer<typeof candidateOptionsSchema>;
export type CandidateLogEntry = z.infer<typeof candidateLogEntrySchema>;
export type CandidateLog = z.infer<typeof candidateLogSchema>;
export type TimesheetEntry = z.infer<typeof timesheetEntrySchema>;
export type Timesheet = z.infer<typeof timesheetSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
export type StoredFile = z.infer<typeof storedFileSchema>;
export type KpiScoreEntry = z.infer<typeof kpiScoreEntrySchema>;
export type KpiAttendanceSummary = z.infer<typeof kpiAttendanceSummarySchema>;
export type KpiReviewSummary = z.infer<typeof kpiReviewSummarySchema>;
export type KpiImprovementDirective = z.infer<
  typeof kpiImprovementDirectiveSchema
>;
export type KpiImprovementPlan = z.infer<typeof kpiImprovementPlanSchema>;
export type KpiPromotionSignal = z.infer<typeof kpiPromotionSignalSchema>;
export type KpiFeeRecommendation = z.infer<typeof kpiFeeRecommendationSchema>;
export type KpiReview = z.infer<typeof kpiReviewSchema>;
export type EvidenceLinkRef = z.infer<typeof evidenceLinkRefSchema>;
export type LinkedEvidence = z.infer<typeof linkedEvidenceSchema>;
export type QuarterlyKpiMonthlyAverage = z.infer<
  typeof quarterlyKpiMonthlyAverageSchema
>;
export type QuarterlyKpiLinkedMonthlyReview = z.infer<
  typeof quarterlyKpiLinkedMonthlyReviewSchema
>;
export type QuarterlyKpiWorkflowSummaries = z.infer<
  typeof quarterlyKpiWorkflowSummariesSchema
>;
export type QuarterlyKpiRollup = z.infer<typeof quarterlyKpiRollupSchema>;
export type PhasePromotionHoursComplianceTrend = z.infer<
  typeof phasePromotionHoursComplianceTrendSchema
>;
export type PhasePromotionTaskTrend = z.infer<typeof phasePromotionTaskTrendSchema>;
export type PhasePromotionRelatedQuarterlySummary = z.infer<
  typeof phasePromotionRelatedQuarterlySummarySchema
>;
export type QuarterlyKpiAssessment = z.infer<
  typeof quarterlyKpiAssessmentSchema
>;
export type QuarterlyKpiActionPlan = z.infer<typeof quarterlyKpiActionPlanSchema>;
export type QuarterlyKpiOutcome = z.infer<typeof quarterlyKpiOutcomeSchema>;
export type QuarterlyKpiSummary = z.infer<typeof quarterlyKpiSummarySchema>;
export type PhasePromotionCaseType = z.infer<typeof phasePromotionCaseTypeSchema>;
export type PhasePromotionChecklistItem = z.infer<typeof phasePromotionChecklistItemSchema>;
export type PhasePromotionEvidence = z.infer<typeof phasePromotionEvidenceSchema>;
export type PhasePromotionLeadRecommendation = z.infer<
  typeof phasePromotionLeadRecommendationSchema
>;
export type PhasePromotionProgramAdminDecision = z.infer<
  typeof phasePromotionProgramAdminDecisionSchema
>;
export type PhasePromotionProgramAdminReview = z.infer<
  typeof phasePromotionProgramAdminReviewSchema
>;
export type PhasePromotionSuperAdminDecision = z.infer<
  typeof phasePromotionSuperAdminDecisionSchema
>;
export type PhasePromotionSuperAdminReview = z.infer<
  typeof phasePromotionSuperAdminReviewSchema
>;
export type PhasePromotionReview = z.infer<typeof phasePromotionReviewSchema>;
export type ReportsFilter = z.infer<typeof reportsFilterSchema>;
export type ReportsOverviewSummary = z.infer<typeof reportsOverviewSummarySchema>;
export type CandidateProgressReportRow = z.infer<typeof candidateProgressReportRowSchema>;
export type ScopePerformanceReportRow = z.infer<typeof scopePerformanceReportRowSchema>;
export type MonthlyKpiReportRow = z.infer<typeof monthlyKpiReportRowSchema>;
export type QuarterlyKpiReportRow = z.infer<typeof quarterlyKpiReportRowSchema>;
export type PhasePromotionPipelineSummary = z.infer<typeof phasePromotionPipelineSummarySchema>;
export type PhasePromotionPipelineRow = z.infer<typeof phasePromotionPipelineRowSchema>;
export type SubmissionComplianceReportRow = z.infer<typeof submissionComplianceReportRowSchema>;
export type ReportsOverview = z.infer<typeof reportsOverviewSchema>;
export type TaskBrief = z.infer<typeof taskBriefSchema>;
export type AuthTokens = z.infer<typeof authTokensSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
export type ListUsersResponse = z.infer<typeof listUsersResponseSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type ListProgramsResponse = z.infer<typeof listProgramsResponseSchema>;
export type ProgramResponse = z.infer<typeof programResponseSchema>;
export type ListBatchesResponse = z.infer<typeof listBatchesResponseSchema>;
export type BatchResponse = z.infer<typeof batchResponseSchema>;
export type ListAssignmentsResponse = z.infer<typeof listAssignmentsResponseSchema>;
export type AssignmentResponse = z.infer<typeof assignmentResponseSchema>;
export type ListCandidatesResponse = z.infer<typeof listCandidatesResponseSchema>;
export type CandidateResponse = z.infer<typeof candidateResponseSchema>;
export type CandidateOptionsResponse = z.infer<typeof candidateOptionsResponseSchema>;
export type ListCandidateLogsResponse = z.infer<
  typeof listCandidateLogsResponseSchema
>;
export type CandidateLogResponse = z.infer<typeof candidateLogResponseSchema>;
export type ListTimesheetsResponse = z.infer<typeof listTimesheetsResponseSchema>;
export type TimesheetResponse = z.infer<typeof timesheetResponseSchema>;
export type ListTaskBriefsResponse = z.infer<typeof listTaskBriefsResponseSchema>;
export type TaskBriefResponse = z.infer<typeof taskBriefResponseSchema>;
export type ListKpiReviewsResponse = z.infer<typeof listKpiReviewsResponseSchema>;
export type KpiReviewResponse = z.infer<typeof kpiReviewResponseSchema>;
export type ListQuarterlyKpiSummariesResponse = z.infer<
  typeof listQuarterlyKpiSummariesResponseSchema
>;
export type QuarterlyKpiSummaryResponse = z.infer<
  typeof quarterlyKpiSummaryResponseSchema
>;
export type ListPhasePromotionReviewsResponse = z.infer<
  typeof listPhasePromotionReviewsResponseSchema
>;
export type PhasePromotionReviewResponse = z.infer<
  typeof phasePromotionReviewResponseSchema
>;
export type ListStoredFilesResponse = z.infer<typeof listStoredFilesResponseSchema>;
export type StoredFileResponse = z.infer<typeof storedFileResponseSchema>;
export type ListNotificationsResponse = z.infer<typeof listNotificationsResponseSchema>;
export type NotificationResponse = z.infer<typeof notificationResponseSchema>;
export type UnreadCountResponse = z.infer<typeof unreadCountResponseSchema>;
export type NotificationPreferencesResponse = z.infer<
  typeof notificationPreferencesResponseSchema
>;
export type ChatRoom = z.infer<typeof chatRoomSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type Call = z.infer<typeof callSchema>;
export type ListChatRoomsResponse = z.infer<typeof listChatRoomsResponseSchema>;
export type ChatRoomResponse = z.infer<typeof chatRoomResponseSchema>;
export type ListChatMessagesResponse = z.infer<typeof listChatMessagesResponseSchema>;
export type ChatMessageResponse = z.infer<typeof chatMessageResponseSchema>;
export type ListCallsResponse = z.infer<typeof listCallsResponseSchema>;
export type CallResponse = z.infer<typeof callResponseSchema>;
export type ReportsOverviewResponse = z.infer<typeof reportsOverviewResponseSchema>;
