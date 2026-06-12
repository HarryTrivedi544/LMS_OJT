export const evidenceChildEntityTypes = [
  "candidate_log",
  "timesheet",
  "task_brief",
  "file",
  "call",
  "kpi_review",
  "quarterly_kpi_summary",
] as const;

export type EvidenceChildEntityType = (typeof evidenceChildEntityTypes)[number];

export const evidenceParentEntityTypes = [
  "kpi_review",
  "quarterly_kpi_summary",
  "phase_promotion_review",
] as const;

export type EvidenceParentEntityType = (typeof evidenceParentEntityTypes)[number];

export type EvidenceLinkRefRecord = {
  entityType: EvidenceChildEntityType;
  entityId: string;
  label: string;
  status: string | null;
  occurredAt: string | null;
  summary: string | null;
  metadata: Record<string, unknown>;
};

export type LinkedEvidenceBundleRecord = {
  dailyLogs: EvidenceLinkRefRecord[];
  timesheets: EvidenceLinkRefRecord[];
  taskBriefs: EvidenceLinkRefRecord[];
  files: EvidenceLinkRefRecord[];
  calls: EvidenceLinkRefRecord[];
  kpiReviews: EvidenceLinkRefRecord[];
  quarterlySummaries: EvidenceLinkRefRecord[];
};

export type QuarterlyLinkedMonthlyReviewRecord = {
  id: string;
  reviewPeriod: string;
  overallScore: number;
  status: string;
};

export type QuarterlyWorkflowSummariesRecord = {
  timesheetSubmissionSummary: string | null;
  dailyLogConsistencySummary: string | null;
  taskCompletionSummary: string | null;
  callEngagementSummary: string | null;
};

export type PhasePromotionHoursComplianceTrendRecord = {
  reviewPeriod: string;
  monthlyTargetHours: number;
  actualHoursLogged: number;
  complianceStatus: string;
};

export type PhasePromotionTaskTrendRecord = {
  reviewPeriod: string;
  approvedCount: number;
  revisionCount: number;
  totalCount: number;
};

export type PhasePromotionRelatedQuarterlySummaryRecord = {
  id: string;
  reviewYear: number;
  reviewQuarter: number;
  quarterlyAverageScore: number | null;
  status: string;
};
