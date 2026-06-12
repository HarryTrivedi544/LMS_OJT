"use client";

import type {
  Candidate,
  CandidateOptions,
  KpiFeeRecommendation,
  KpiImprovementDirective,
  KpiReview,
  KpiScoreEntry,
  PhasePromotionChecklistItem,
  PhasePromotionProgramAdminDecision,
  PhasePromotionReview,
  PhasePromotionSuperAdminDecision,
  QuarterlyKpiSummary,
} from "@lms/api-contracts";
import {
  ArrowUpCircle,
  CheckCircle2,
  ClipboardList,
  Filter,
  LineChart,
  Pencil,
  Plus,
  Send,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../components/auth/auth-provider";
import { LinkedEvidencePanel } from "../../components/kpi-reviews/linked-evidence-panel";
import { AppShell } from "../../components/layout/app-shell";
import {
  acknowledgePhasePromotionReview,
  completeKpiReview,
  completeQuarterlyKpiSummary,
  createKpiReview,
  createPhasePromotionReview,
  createQuarterlyKpiSummary,
  decidePhasePromotionBySuperAdmin,
  listCandidateOptions,
  listCandidates,
  listKpiReviews,
  listPhasePromotionReviews,
  listQuarterlyKpiSummaries,
  reviewPhasePromotionByProgramAdmin,
  submitPhasePromotionReview,
  updateKpiReview,
  updatePhasePromotionReview,
  updateQuarterlyKpiSummary,
} from "../../lib/api";

const KPI_CRITERIA = [
  {
    key: "attendance_time_discipline",
    label: "Attendance and time discipline",
    description: "Consistency in attendance, availability, and work discipline",
  },
  {
    key: "delivery_timeliness",
    label: "Delivery timeliness",
    description: "Task completion on or before deadline",
  },
  {
    key: "quality_of_work",
    label: "Quality of work",
    description: "Accuracy, completeness, and professional quality of output",
  },
  {
    key: "learning_progress",
    label: "Learning progress",
    description: "Measurable capability improvement since the last review",
  },
  {
    key: "communication",
    label: "Communication",
    description: "Reporting quality, clarity, and professional interaction",
  },
  {
    key: "ownership",
    label: "Ownership",
    description: "Responsibility, follow-through, and self-direction",
  },
  {
    key: "review_response",
    label: "Review response",
    description: "Quality and speed of response to feedback",
  },
  {
    key: "team_contribution",
    label: "Team contribution",
    description: "Cooperation, support, and working-culture alignment",
  },
  {
    key: "professional_conduct",
    label: "Professional conduct",
    description: "Professional behavior, reliability, and discipline",
  },
  {
    key: "phase_readiness",
    label: "Phase readiness",
    description: "Readiness to operate at the next phase level",
  },
] as const;

const quarterlyOutcomes = [
  { value: "on_track", label: "On track" },
  { value: "on_track_with_support", label: "On track with support" },
  { value: "needs_improvement_plan", label: "Needs improvement plan" },
  { value: "promotion_track_candidate", label: "Promotion track candidate" },
  { value: "not_ready_for_promotion_track", label: "Not ready for promotion track" },
] as const;

const promotionCaseTypes = [
  { value: "normal_eligibility", label: "Normal eligibility" },
  { value: "exception_case", label: "Exception case" },
] as const;

const promotionProgramAdminDecisions = [
  { value: "recommend_approval", label: "Recommend approval" },
  { value: "recommend_rejection", label: "Recommend rejection" },
  { value: "revision_required", label: "Send for revision" },
] as const;

const promotionSuperAdminDecisions = [
  { value: "approved", label: "Approve" },
  { value: "rejected", label: "Reject" },
  { value: "revision_required", label: "Send for revision" },
] as const;

const promotionChecklistTemplate = [
  { key: "phase_tenure", label: "Minimum phase tenure completed" },
  { key: "kpi_consistency", label: "Recent KPI performance is consistent" },
  { key: "hours_compliance", label: "Hours and attendance compliance is acceptable" },
  { key: "task_delivery", label: "Task delivery and ownership meet next phase expectations" },
  { key: "quality_readiness", label: "Quality and rework trend support promotion" },
  { key: "independence_signal", label: "Independent delivery and leadership signals observed" },
] as const;

const initialMonthlyFilters = {
  programId: "",
  batchId: "",
  candidateId: "",
  status: "",
  reviewPeriod: "",
};

const initialQuarterlyFilters = {
  programId: "",
  batchId: "",
  candidateId: "",
  status: "",
  reviewYear: "",
  reviewQuarter: "",
};

const initialPromotionFilters = {
  programId: "",
  batchId: "",
  candidateId: "",
  status: "",
  caseType: "",
};

const currentReviewPeriod = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${now.getFullYear()}-${month}`;
};

const currentDate = () => new Date().toISOString().slice(0, 10);

type ComplianceStatus = "full_compliance" | "partial" | "non_compliant";

type MonthlyFormState = {
  candidateId: string;
  reviewPeriod: string;
  reviewDate: string;
  currentPhase: string;
  currentDesignation: string;
  programStartDate: string;
  monthsInCurrentPhase: number;
  attendanceSummary: {
    monthlyTargetHours: number;
    actualHoursLogged: number;
    workingDaysAvailable: string;
    daysAbsent: number;
    publicHolidays: number;
    nonAvailabilityDays: number;
    complianceStatus: ComplianceStatus;
  };
  scores: KpiScoreEntry[];
  topStrengths: string[];
  improvementAreas: string[];
  notableAchievements: string;
  qualityIssues: string;
  feedbackResponse: string;
  conductConcerns: string;
  directives: KpiImprovementDirective[];
  pipConsideration: boolean;
  nextReviewDate: string;
  promotionWatch: boolean;
  readyForPromotion: boolean;
  feeDecision: KpiFeeRecommendation["decision"];
  feeIncrementAmount: string;
  feeJustification: string;
  feedback: string;
};

type QuarterlyFormState = {
  candidateId: string;
  reviewYear: string;
  reviewQuarter: string;
  reviewDate: string;
  currentPhase: string;
  currentDesignation: string;
  strengths: string[];
  improvementPriorities: string[];
  technicalGrowthSummary: string;
  deliveryConsistencySummary: string;
  communicationCollaborationSummary: string;
  ownershipIndependenceSummary: string;
  reviewResponsivenessSummary: string;
  riskFlags: string;
  recommendedFocus: string;
  nextQuarterGoals: string;
  expectedSkillImprovements: string;
  expectedDeliveryImprovements: string;
  supportRequired: string;
  followUpDate: string;
  outcome: "" | (typeof quarterlyOutcomes)[number]["value"];
  feedback: string;
};

type PromotionFormState = {
  candidateId: string;
  preparedDate: string;
  currentPhase: string;
  currentDesignation: string;
  proposedNextPhase: string;
  proposedNextDesignation: string;
  currentMonthlyFee: string;
  proposedMonthlyFee: string;
  currentPhaseStartDate: string;
  monthsInCurrentPhase: string;
  promotionEffectiveDate: string;
  promotionCycleType: string;
  caseType: (typeof promotionCaseTypes)[number]["value"];
  exceptionReason: string;
  qualityReworkSummary: string;
  leadReviewSummary: string;
  keyProjectsCompleted: string[];
  skillsDemonstrated: string[];
  independentDeliveryEvidence: string;
  mentoringLeadershipSignals: string;
  repositoryLinks: string[];
  supportingFileIds: string[];
  eligibilityChecklist: PhasePromotionChecklistItem[];
  leadRecommendation: "promote" | "promote_with_conditions" | "hold";
  leadRecommendationSummary: string;
  leadRecommendationConditions: string;
  initialAssignmentNextPhase: string;
};

const createScoreRows = (): KpiScoreEntry[] =>
  KPI_CRITERIA.map((criterion) => ({
    key: criterion.key,
    criterion: criterion.label,
    score: 0,
    maxScore: 10,
    notes: "",
  }));

const createDirectiveRow = (): KpiImprovementDirective => ({
  criterionKey: KPI_CRITERIA[0].key,
  criterionLabel: KPI_CRITERIA[0].label,
  directive: "",
  measurementDeadline: "",
});

const createInitialMonthlyForm = (): MonthlyFormState => ({
  candidateId: "",
  reviewPeriod: "",
  reviewDate: "",
  currentPhase: "",
  currentDesignation: "",
  programStartDate: "",
  monthsInCurrentPhase: 0,
  attendanceSummary: {
    monthlyTargetHours: 160,
    actualHoursLogged: 0,
    workingDaysAvailable: "",
    daysAbsent: 0,
    publicHolidays: 0,
    nonAvailabilityDays: 0,
    complianceStatus: "non_compliant",
  },
  scores: createScoreRows(),
  topStrengths: ["", "", ""],
  improvementAreas: ["", "", ""],
  notableAchievements: "",
  qualityIssues: "",
  feedbackResponse: "",
  conductConcerns: "",
  directives: [],
  pipConsideration: false,
  nextReviewDate: "",
  promotionWatch: false,
  readyForPromotion: false,
  feeDecision: "maintain",
  feeIncrementAmount: "",
  feeJustification: "",
  feedback: "",
});

const createInitialQuarterlyForm = (): QuarterlyFormState => ({
  candidateId: "",
  reviewYear: "",
  reviewQuarter: "",
  reviewDate: "",
  currentPhase: "",
  currentDesignation: "",
  strengths: ["", "", ""],
  improvementPriorities: ["", "", ""],
  technicalGrowthSummary: "",
  deliveryConsistencySummary: "",
  communicationCollaborationSummary: "",
  ownershipIndependenceSummary: "",
  reviewResponsivenessSummary: "",
  riskFlags: "",
  recommendedFocus: "",
  nextQuarterGoals: "",
  expectedSkillImprovements: "",
  expectedDeliveryImprovements: "",
  supportRequired: "",
  followUpDate: "",
  outcome: "",
  feedback: "",
});

const createInitialPromotionChecklist = (): PhasePromotionChecklistItem[] =>
  promotionChecklistTemplate.map((item) => ({
    criterionKey: item.key,
    criterionLabel: item.label,
    isMet: false,
    evidence: "",
  }));

const createInitialPromotionForm = (): PromotionFormState => ({
  candidateId: "",
  preparedDate: "",
  currentPhase: "",
  currentDesignation: "",
  proposedNextPhase: "",
  proposedNextDesignation: "",
  currentMonthlyFee: "",
  proposedMonthlyFee: "",
  currentPhaseStartDate: "",
  monthsInCurrentPhase: "",
  promotionEffectiveDate: "",
  promotionCycleType: "Quarterly cycle",
  caseType: "normal_eligibility",
  exceptionReason: "",
  qualityReworkSummary: "",
  leadReviewSummary: "",
  keyProjectsCompleted: ["", "", ""],
  skillsDemonstrated: ["", "", "", ""],
  independentDeliveryEvidence: "",
  mentoringLeadershipSignals: "",
  repositoryLinks: [""],
  supportingFileIds: [],
  eligibilityChecklist: createInitialPromotionChecklist(),
  leadRecommendation: "hold",
  leadRecommendationSummary: "",
  leadRecommendationConditions: "",
  initialAssignmentNextPhase: "",
});

const emptySlots = (values: string[], size = 3) =>
  [...values, ...Array.from({ length: size }, () => "")].slice(0, size);

const formatComplianceStatus = (status: string) => status.replaceAll("_", " ");
const formatOverallRating = (rating: string) => rating.replaceAll("_", " ");
const formatQuarterlyOutcome = (outcome: string) => outcome.replaceAll("_", " ");
const formatPromotionCaseType = (value: string) => value.replaceAll("_", " ");

export default function KpiReviewsPage() {
  const { accessToken, user } = useAuth();
  const [activeView, setActiveView] = useState<"monthly" | "quarterly" | "promotion">(
    "monthly",
  );
  const [kpiReviews, setKpiReviews] = useState<KpiReview[]>([]);
  const [quarterlySummaries, setQuarterlySummaries] = useState<QuarterlyKpiSummary[]>([]);
  const [promotionReviews, setPromotionReviews] = useState<PhasePromotionReview[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateOptions, setCandidateOptions] = useState<CandidateOptions>({
    programs: [],
    batches: [],
  });
  const [monthlyFilters, setMonthlyFilters] = useState(initialMonthlyFilters);
  const [quarterlyFilters, setQuarterlyFilters] = useState(initialQuarterlyFilters);
  const [promotionFilters, setPromotionFilters] = useState(initialPromotionFilters);
  const [monthlyForm, setMonthlyForm] = useState<MonthlyFormState>(createInitialMonthlyForm());
  const [quarterlyForm, setQuarterlyForm] = useState<QuarterlyFormState>(
    createInitialQuarterlyForm(),
  );
  const [promotionForm, setPromotionForm] = useState<PromotionFormState>(
    createInitialPromotionForm(),
  );
  const [editingMonthlyId, setEditingMonthlyId] = useState<string | null>(null);
  const [editingQuarterlyId, setEditingQuarterlyId] = useState<string | null>(null);
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const [programAdminDecisionDrafts, setProgramAdminDecisionDrafts] = useState<
    Record<string, { decision: PhasePromotionProgramAdminDecision; note: string }>
  >({});
  const [superAdminDecisionDrafts, setSuperAdminDecisionDrafts] = useState<
    Record<string, { decision: PhasePromotionSuperAdminDecision; note: string }>
  >({});
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCandidate = user?.role === "Candidate";
  const canManage =
    user?.role === "Super Admin" ||
    user?.role === "Program Admin" ||
    user?.role === "Program Lead";
  const canSeeFeeRecommendation =
    user?.role === "Super Admin" || user?.role === "Program Admin";
  const canProgramAdminReview =
    user?.role === "Super Admin" || user?.role === "Program Admin";
  const canSuperAdminDecide = user?.role === "Super Admin";

  const availableBatchesForMonthly = useMemo(
    () =>
      candidateOptions.batches.filter(
        (batch) => !monthlyFilters.programId || batch.programId === monthlyFilters.programId,
      ),
    [candidateOptions.batches, monthlyFilters.programId],
  );

  const availableCandidatesForMonthly = useMemo(
    () =>
      candidates
        .filter(
          (candidate) =>
            (!monthlyFilters.programId || candidate.programId === monthlyFilters.programId) &&
            (!monthlyFilters.batchId || candidate.batchId === monthlyFilters.batchId),
        )
        .map((candidate) => ({
          id: candidate.id,
          label: `${candidate.fullName} (${candidate.candidateCode})`,
        })),
    [candidates, monthlyFilters.batchId, monthlyFilters.programId],
  );

  const availableBatchesForQuarterly = useMemo(
    () =>
      candidateOptions.batches.filter(
        (batch) => !quarterlyFilters.programId || batch.programId === quarterlyFilters.programId,
      ),
    [candidateOptions.batches, quarterlyFilters.programId],
  );

  const availableCandidatesForQuarterly = useMemo(
    () =>
      candidates
        .filter(
          (candidate) =>
            (!quarterlyFilters.programId || candidate.programId === quarterlyFilters.programId) &&
            (!quarterlyFilters.batchId || candidate.batchId === quarterlyFilters.batchId),
        )
        .map((candidate) => ({
          id: candidate.id,
          label: `${candidate.fullName} (${candidate.candidateCode})`,
        })),
    [candidates, quarterlyFilters.batchId, quarterlyFilters.programId],
  );

  const availableBatchesForPromotion = useMemo(
    () =>
      candidateOptions.batches.filter(
        (batch) => !promotionFilters.programId || batch.programId === promotionFilters.programId,
      ),
    [candidateOptions.batches, promotionFilters.programId],
  );

  const availableCandidatesForPromotion = useMemo(
    () =>
      candidates
        .filter(
          (candidate) =>
            (!promotionFilters.programId || candidate.programId === promotionFilters.programId) &&
            (!promotionFilters.batchId || candidate.batchId === promotionFilters.batchId),
        )
        .map((candidate) => ({
          id: candidate.id,
          label: `${candidate.fullName} (${candidate.candidateCode})`,
        })),
    [candidates, promotionFilters.batchId, promotionFilters.programId],
  );

  const assignableCandidates = useMemo(
    () =>
      candidates.map((candidate) => ({
        id: candidate.id,
        label: `${candidate.fullName} (${candidate.candidateCode})`,
      })),
    [candidates],
  );

  const loadMonthlyReviews = async (nextFilters = monthlyFilters) => {
    if (!accessToken) {
      return;
    }

    const data = await listKpiReviews(accessToken, nextFilters);
    setKpiReviews(data);
  };

  const loadQuarterlySummaries = async (nextFilters = quarterlyFilters) => {
    if (!accessToken) {
      return;
    }

    const data = await listQuarterlyKpiSummaries(accessToken, nextFilters);
    setQuarterlySummaries(data);
  };

  const loadPromotionReviews = async (nextFilters = promotionFilters) => {
    if (!accessToken) {
      return;
    }

    const data = await listPhasePromotionReviews(accessToken, nextFilters);
    setPromotionReviews(data);
  };

  const loadPageData = async () => {
    if (!accessToken) {
      return;
    }

    setError(null);
    const [nextReviews, nextQuarterlies, nextPromotions, nextCandidates, nextOptions] =
      await Promise.all([
      listKpiReviews(accessToken, monthlyFilters),
      listQuarterlyKpiSummaries(accessToken, quarterlyFilters),
      listPhasePromotionReviews(accessToken, promotionFilters),
      listCandidates(accessToken),
      listCandidateOptions(accessToken),
    ]);

    setKpiReviews(nextReviews);
    setQuarterlySummaries(nextQuarterlies);
    setPromotionReviews(nextPromotions);
    setCandidates(nextCandidates);
    setCandidateOptions(nextOptions);
  };

  useEffect(() => {
    void loadPageData().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load KPI workspace.");
    });
  }, [accessToken]);

  useEffect(() => {
    if (!promotionForm.candidateId || editingPromotionId) {
      return;
    }

    const candidate = candidates.find((entry) => entry.id === promotionForm.candidateId);

    if (!candidate) {
      return;
    }

    setPromotionForm((current) => ({
      ...current,
      currentPhase: current.currentPhase || candidate.currentPhase || "",
      currentDesignation: current.currentDesignation || candidate.currentDesignation || "",
      currentMonthlyFee:
        current.currentMonthlyFee ||
        (candidate.currentMonthlyFee !== null ? String(candidate.currentMonthlyFee) : ""),
      currentPhaseStartDate:
        current.currentPhaseStartDate || candidate.currentPhaseStartDate || "",
    }));
  }, [candidates, editingPromotionId, promotionForm.candidateId]);

  useEffect(() => {
    const today = currentDate();
    const reviewPeriod = currentReviewPeriod();
    const reviewYear = String(new Date().getFullYear());
    const reviewQuarter = String(Math.floor(new Date().getMonth() / 3) + 1);

    setMonthlyForm((current) =>
      current.reviewDate || current.reviewPeriod
        ? current
        : {
            ...current,
            reviewDate: today,
            reviewPeriod,
          },
    );

    setQuarterlyForm((current) =>
      current.reviewDate || current.reviewYear || current.reviewQuarter
        ? current
        : {
            ...current,
            reviewDate: today,
            reviewYear,
            reviewQuarter,
          },
    );

    setPromotionForm((current) =>
      current.preparedDate || current.promotionEffectiveDate
        ? current
        : {
            ...current,
            preparedDate: today,
            promotionEffectiveDate: today,
          },
    );
  }, []);

  const resetMonthlyForm = () => {
    setMonthlyForm(createInitialMonthlyForm());
    setEditingMonthlyId(null);
  };

  const resetQuarterlyForm = () => {
    setQuarterlyForm(createInitialQuarterlyForm());
    setEditingQuarterlyId(null);
  };

  const resetPromotionForm = () => {
    setPromotionForm(createInitialPromotionForm());
    setEditingPromotionId(null);
  };

  const setMonthlySummaryListValue = (
    field: "topStrengths" | "improvementAreas",
    index: number,
    value: string,
  ) => {
    setMonthlyForm((current) => ({
      ...current,
      [field]: current[field].map((entry, entryIndex) =>
        entryIndex === index ? value : entry,
      ),
    }));
  };

  const setQuarterlyListValue = (
    field: "strengths" | "improvementPriorities",
    index: number,
    value: string,
  ) => {
    setQuarterlyForm((current) => ({
      ...current,
      [field]: current[field].map((entry, entryIndex) =>
        entryIndex === index ? value : entry,
      ),
    }));
  };

  const setPromotionListValue = (
    field: "keyProjectsCompleted" | "skillsDemonstrated" | "repositoryLinks",
    index: number,
    value: string,
  ) => {
    setPromotionForm((current) => ({
      ...current,
      [field]: current[field].map((entry, entryIndex) =>
        entryIndex === index ? value : entry,
      ),
    }));
  };

  const updatePromotionChecklistItem = (
    index: number,
    field: "isMet" | "evidence",
    value: boolean | string,
  ) => {
    setPromotionForm((current) => ({
      ...current,
      eligibilityChecklist: current.eligibilityChecklist.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const updateMonthlyScoreRow = (
    index: number,
    field: "score" | "notes",
    value: string | number,
  ) => {
    setMonthlyForm((current) => ({
      ...current,
      scores: current.scores.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry,
      ),
    }));
  };

  const updateDirective = (
    index: number,
    field: keyof KpiImprovementDirective,
    value: string,
  ) => {
    setMonthlyForm((current) => ({
      ...current,
      directives: current.directives.map((directive, directiveIndex) => {
        if (directiveIndex !== index) {
          return directive;
        }

        if (field === "criterionKey") {
          const selectedCriterion = KPI_CRITERIA.find((criterion) => criterion.key === value);

          return {
            ...directive,
            criterionKey: value,
            criterionLabel: selectedCriterion?.label ?? directive.criterionLabel,
          };
        }

        return { ...directive, [field]: value };
      }),
    }));
  };

  const removeDirective = (index: number) => {
    setMonthlyForm((current) => ({
      ...current,
      directives: current.directives.filter((_, directiveIndex) => directiveIndex !== index),
    }));
  };

  const buildMonthlyFeeRecommendation = (): KpiFeeRecommendation | undefined => {
    if (!canSeeFeeRecommendation) {
      return undefined;
    }

    return {
      decision: monthlyForm.feeDecision,
      incrementAmount:
        monthlyForm.feeDecision === "increment" && monthlyForm.feeIncrementAmount
          ? Number(monthlyForm.feeIncrementAmount)
          : null,
      justification: monthlyForm.feeJustification || null,
    };
  };

  const buildMonthlyPayload = () => ({
    reviewDate: monthlyForm.reviewDate,
    currentPhase: monthlyForm.currentPhase,
    currentDesignation: monthlyForm.currentDesignation,
    programStartDate: monthlyForm.programStartDate || undefined,
    monthsInCurrentPhase: monthlyForm.monthsInCurrentPhase,
    attendanceSummary: {
      monthlyTargetHours: Number(monthlyForm.attendanceSummary.monthlyTargetHours),
      actualHoursLogged: Number(monthlyForm.attendanceSummary.actualHoursLogged),
      workingDaysAvailable:
        monthlyForm.attendanceSummary.workingDaysAvailable === ""
          ? null
          : Number(monthlyForm.attendanceSummary.workingDaysAvailable),
      daysAbsent: Number(monthlyForm.attendanceSummary.daysAbsent),
      publicHolidays: Number(monthlyForm.attendanceSummary.publicHolidays),
      nonAvailabilityDays: Number(monthlyForm.attendanceSummary.nonAvailabilityDays),
      complianceStatus: monthlyForm.attendanceSummary.complianceStatus,
    },
    scores: monthlyForm.scores,
    summary: {
      topStrengths: monthlyForm.topStrengths.map((entry) => entry.trim()).filter(Boolean),
      improvementAreas: monthlyForm.improvementAreas.map((entry) => entry.trim()).filter(Boolean),
      notableAchievements: monthlyForm.notableAchievements || undefined,
      qualityIssues: monthlyForm.qualityIssues || undefined,
      feedbackResponse: monthlyForm.feedbackResponse || undefined,
      conductConcerns: monthlyForm.conductConcerns || undefined,
    },
    improvementPlan: {
      pipConsideration: monthlyForm.pipConsideration,
      nextReviewDate: monthlyForm.nextReviewDate || undefined,
      directives: monthlyForm.directives.filter(
        (directive) =>
          directive.directive.trim().length > 0 &&
          directive.measurementDeadline.trim().length > 0,
      ),
    },
    promotionSignal: {
      promotionWatch: monthlyForm.promotionWatch,
      readyForPromotion: monthlyForm.readyForPromotion,
    },
    feeRecommendation: buildMonthlyFeeRecommendation(),
    feedback: monthlyForm.feedback || undefined,
  });

  const buildQuarterlyPayload = () => ({
    reviewDate: quarterlyForm.reviewDate,
    currentPhase: quarterlyForm.currentPhase,
    currentDesignation: quarterlyForm.currentDesignation,
    assessment: {
      technicalGrowthSummary: quarterlyForm.technicalGrowthSummary || undefined,
      deliveryConsistencySummary: quarterlyForm.deliveryConsistencySummary || undefined,
      communicationCollaborationSummary:
        quarterlyForm.communicationCollaborationSummary || undefined,
      ownershipIndependenceSummary: quarterlyForm.ownershipIndependenceSummary || undefined,
      reviewResponsivenessSummary: quarterlyForm.reviewResponsivenessSummary || undefined,
      riskFlags: quarterlyForm.riskFlags || undefined,
      strengths: quarterlyForm.strengths.map((entry) => entry.trim()).filter(Boolean),
      improvementPriorities: quarterlyForm.improvementPriorities
        .map((entry) => entry.trim())
        .filter(Boolean),
      recommendedFocus: quarterlyForm.recommendedFocus || undefined,
    },
    actionPlan: {
      nextQuarterGoals: quarterlyForm.nextQuarterGoals || undefined,
      expectedSkillImprovements: quarterlyForm.expectedSkillImprovements || undefined,
      expectedDeliveryImprovements: quarterlyForm.expectedDeliveryImprovements || undefined,
      supportRequired: quarterlyForm.supportRequired || undefined,
      followUpDate: quarterlyForm.followUpDate || undefined,
    },
    outcome: quarterlyForm.outcome || undefined,
    feedback: quarterlyForm.feedback || undefined,
  });

  const buildPromotionPayload = () => ({
    preparedDate: promotionForm.preparedDate,
    currentPhase: promotionForm.currentPhase,
    currentDesignation: promotionForm.currentDesignation,
    proposedNextPhase: promotionForm.proposedNextPhase,
    proposedNextDesignation: promotionForm.proposedNextDesignation,
    currentMonthlyFee: promotionForm.currentMonthlyFee
      ? Number(promotionForm.currentMonthlyFee)
      : undefined,
    proposedMonthlyFee: promotionForm.proposedMonthlyFee
      ? Number(promotionForm.proposedMonthlyFee)
      : undefined,
    currentPhaseStartDate: promotionForm.currentPhaseStartDate || undefined,
    monthsInCurrentPhase: promotionForm.monthsInCurrentPhase
      ? Number(promotionForm.monthsInCurrentPhase)
      : undefined,
    promotionEffectiveDate: promotionForm.promotionEffectiveDate,
    promotionCycleType: promotionForm.promotionCycleType,
    caseType: promotionForm.caseType,
    exceptionReason:
      promotionForm.caseType === "exception_case" ? promotionForm.exceptionReason : undefined,
    evidence: {
      qualityReworkSummary: promotionForm.qualityReworkSummary || undefined,
      leadReviewSummary: promotionForm.leadReviewSummary || undefined,
      keyProjectsCompleted: promotionForm.keyProjectsCompleted
        .map((entry) => entry.trim())
        .filter(Boolean),
      skillsDemonstrated: promotionForm.skillsDemonstrated
        .map((entry) => entry.trim())
        .filter(Boolean),
      independentDeliveryEvidence: promotionForm.independentDeliveryEvidence || undefined,
      mentoringLeadershipSignals: promotionForm.mentoringLeadershipSignals || undefined,
      repositoryLinks: promotionForm.repositoryLinks.map((entry) => entry.trim()).filter(Boolean),
      supportingFileIds: promotionForm.supportingFileIds,
    },
    eligibilityChecklist: promotionForm.eligibilityChecklist.map((item) => ({
      ...item,
      evidence: item.evidence?.trim() || "",
    })),
    leadRecommendation: {
      recommendation: promotionForm.leadRecommendation,
      summary: promotionForm.leadRecommendationSummary || undefined,
      conditions: promotionForm.leadRecommendationConditions || undefined,
      initialAssignmentNextPhase: promotionForm.initialAssignmentNextPhase || undefined,
    },
  });

  const handleSubmitMonthlyReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || !canManage) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const payload = buildMonthlyPayload();
      const review = editingMonthlyId
        ? await updateKpiReview(accessToken, editingMonthlyId, payload)
        : await createKpiReview(accessToken, {
            candidateId: monthlyForm.candidateId,
            reviewPeriod: monthlyForm.reviewPeriod,
            ...payload,
          });

      setMessage(
        editingMonthlyId
          ? `Updated draft review for ${review.fullName}.`
          : `Created monthly KPI review for ${review.fullName} (${review.reviewPeriod}).`,
      );
      resetMonthlyForm();
      await loadMonthlyReviews();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to save KPI review.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmitQuarterlySummary = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || !canManage) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const payload = buildQuarterlyPayload();
      const summary = editingQuarterlyId
        ? await updateQuarterlyKpiSummary(accessToken, editingQuarterlyId, payload)
        : await createQuarterlyKpiSummary(accessToken, {
            candidateId: quarterlyForm.candidateId,
            reviewYear: Number(quarterlyForm.reviewYear),
            reviewQuarter: Number(quarterlyForm.reviewQuarter),
            ...payload,
          });

      setMessage(
        editingQuarterlyId
          ? `Updated quarterly summary for ${summary.fullName}.`
          : `Created quarterly summary for ${summary.fullName} (Q${summary.reviewQuarter} ${summary.reviewYear}).`,
      );
      resetQuarterlyForm();
      await loadQuarterlySummaries();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save quarterly KPI summary.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmitPromotionReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || !canManage) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const payload = buildPromotionPayload();
      const review = editingPromotionId
        ? await updatePhasePromotionReview(accessToken, editingPromotionId, payload)
        : await createPhasePromotionReview(accessToken, {
            candidateId: promotionForm.candidateId,
            ...payload,
          });

      setMessage(
        editingPromotionId
          ? `Updated phase promotion review for ${review.fullName}.`
          : `Created phase promotion review for ${review.fullName}.`,
      );
      resetPromotionForm();
      await loadPromotionReviews();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save phase promotion review.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleCompleteMonthlyReview = async (review: KpiReview) => {
    if (!accessToken || !canManage) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const completedReview = await completeKpiReview(accessToken, review.id);
      setMessage(
        `Completed KPI review for ${completedReview.fullName} (${completedReview.reviewPeriod}).`,
      );

      if (editingMonthlyId === review.id) {
        resetMonthlyForm();
      }

      await loadMonthlyReviews();
    } catch (completeError) {
      setError(
        completeError instanceof Error ? completeError.message : "Failed to complete KPI review.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleCompleteQuarterlySummary = async (summary: QuarterlyKpiSummary) => {
    if (!accessToken || !canManage) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const completedSummary = await completeQuarterlyKpiSummary(accessToken, summary.id);
      setMessage(
        `Completed quarterly summary for ${completedSummary.fullName} (Q${completedSummary.reviewQuarter} ${completedSummary.reviewYear}).`,
      );

      if (editingQuarterlyId === summary.id) {
        resetQuarterlyForm();
      }

      await loadQuarterlySummaries();
    } catch (completeError) {
      setError(
        completeError instanceof Error
          ? completeError.message
          : "Failed to complete quarterly summary.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmitPromotionForReview = async (review: PhasePromotionReview) => {
    if (!accessToken || !canManage) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const submitted = await submitPhasePromotionReview(accessToken, review.id);
      setMessage(`Submitted phase promotion review for ${submitted.fullName}.`);

      if (editingPromotionId === review.id) {
        resetPromotionForm();
      }

      await loadPromotionReviews();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to submit phase promotion review.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleProgramAdminPromotionReview = async (review: PhasePromotionReview) => {
    if (!accessToken || !canProgramAdminReview) {
      return;
    }

    const draft = programAdminDecisionDrafts[review.id];

    if (!draft?.note.trim()) {
      setError("Program Admin review note is required.");
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const updated = await reviewPhasePromotionByProgramAdmin(accessToken, review.id, draft);
      setMessage(`Program Admin review saved for ${updated.fullName}.`);
      await loadPromotionReviews();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Failed to review phase promotion request.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleSuperAdminPromotionDecision = async (review: PhasePromotionReview) => {
    if (!accessToken || !canSuperAdminDecide) {
      return;
    }

    const draft = superAdminDecisionDrafts[review.id];

    if (!draft?.note.trim()) {
      setError("Super Admin decision note is required.");
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const updated = await decidePhasePromotionBySuperAdmin(accessToken, review.id, draft);
      setMessage(`Final decision recorded for ${updated.fullName}.`);
      await loadPromotionReviews();
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : "Failed to record final promotion decision.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleAcknowledgePromotionReview = async (review: PhasePromotionReview) => {
    if (!accessToken || !isCandidate) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const updated = await acknowledgePhasePromotionReview(accessToken, review.id);
      setMessage(`Acknowledged promotion review for ${updated.fullName}.`);
      await loadPromotionReviews();
    } catch (ackError) {
      setError(
        ackError instanceof Error
          ? ackError.message
          : "Failed to acknowledge promotion review.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleEditMonthlyDraft = (review: KpiReview) => {
    setEditingMonthlyId(review.id);
    setActiveView("monthly");
    setMonthlyForm({
      candidateId: review.candidateId,
      reviewPeriod: review.reviewPeriod,
      reviewDate: review.reviewDate ?? currentDate(),
      currentPhase: review.currentPhase ?? "",
      currentDesignation: review.currentDesignation ?? "",
      programStartDate: review.programStartDate ?? "",
      monthsInCurrentPhase: review.monthsInCurrentPhase ?? 0,
      attendanceSummary: {
        monthlyTargetHours: review.attendanceSummary.monthlyTargetHours,
        actualHoursLogged: review.attendanceSummary.actualHoursLogged,
        workingDaysAvailable:
          review.attendanceSummary.workingDaysAvailable === null
            ? ""
            : String(review.attendanceSummary.workingDaysAvailable),
        daysAbsent: review.attendanceSummary.daysAbsent,
        publicHolidays: review.attendanceSummary.publicHolidays,
        nonAvailabilityDays: review.attendanceSummary.nonAvailabilityDays,
        complianceStatus: review.attendanceSummary.complianceStatus,
      },
      scores: review.scores.map((entry) => ({
        ...entry,
        notes: entry.notes ?? "",
      })),
      topStrengths: emptySlots(review.summary.topStrengths),
      improvementAreas: emptySlots(review.summary.improvementAreas),
      notableAchievements: review.summary.notableAchievements ?? "",
      qualityIssues: review.summary.qualityIssues ?? "",
      feedbackResponse: review.summary.feedbackResponse ?? "",
      conductConcerns: review.summary.conductConcerns ?? "",
      directives: review.improvementPlan.directives,
      pipConsideration: review.improvementPlan.pipConsideration,
      nextReviewDate: review.improvementPlan.nextReviewDate ?? "",
      promotionWatch: review.promotionSignal.promotionWatch,
      readyForPromotion: review.promotionSignal.readyForPromotion,
      feeDecision: review.feeRecommendation?.decision ?? "maintain",
      feeIncrementAmount:
        review.feeRecommendation?.incrementAmount !== null &&
        review.feeRecommendation?.incrementAmount !== undefined
          ? String(review.feeRecommendation.incrementAmount)
          : "",
      feeJustification: review.feeRecommendation?.justification ?? "",
      feedback: review.feedback ?? "",
    });
    setMessage(null);
    setError(null);
  };

  const handleEditQuarterlyDraft = (summary: QuarterlyKpiSummary) => {
    setEditingQuarterlyId(summary.id);
    setActiveView("quarterly");
    setQuarterlyForm({
      candidateId: summary.candidateId,
      reviewYear: String(summary.reviewYear),
      reviewQuarter: String(summary.reviewQuarter),
      reviewDate: summary.reviewDate ?? currentDate(),
      currentPhase: summary.currentPhase ?? "",
      currentDesignation: summary.currentDesignation ?? "",
      strengths: emptySlots(summary.assessment.strengths),
      improvementPriorities: emptySlots(summary.assessment.improvementPriorities),
      technicalGrowthSummary: summary.assessment.technicalGrowthSummary ?? "",
      deliveryConsistencySummary: summary.assessment.deliveryConsistencySummary ?? "",
      communicationCollaborationSummary:
        summary.assessment.communicationCollaborationSummary ?? "",
      ownershipIndependenceSummary: summary.assessment.ownershipIndependenceSummary ?? "",
      reviewResponsivenessSummary: summary.assessment.reviewResponsivenessSummary ?? "",
      riskFlags: summary.assessment.riskFlags ?? "",
      recommendedFocus: summary.assessment.recommendedFocus ?? "",
      nextQuarterGoals: summary.actionPlan.nextQuarterGoals ?? "",
      expectedSkillImprovements: summary.actionPlan.expectedSkillImprovements ?? "",
      expectedDeliveryImprovements: summary.actionPlan.expectedDeliveryImprovements ?? "",
      supportRequired: summary.actionPlan.supportRequired ?? "",
      followUpDate: summary.actionPlan.followUpDate ?? "",
      outcome: summary.outcome ?? "",
      feedback: summary.feedback ?? "",
    });
    setMessage(null);
    setError(null);
  };

  const handleEditPromotionDraft = (review: PhasePromotionReview) => {
    setEditingPromotionId(review.id);
    setActiveView("promotion");
    setPromotionForm({
      candidateId: review.candidateId,
      preparedDate: review.preparedDate,
      currentPhase: review.currentPhase,
      currentDesignation: review.currentDesignation,
      proposedNextPhase: review.proposedNextPhase,
      proposedNextDesignation: review.proposedNextDesignation,
      currentMonthlyFee:
        review.currentMonthlyFee !== null ? String(review.currentMonthlyFee) : "",
      proposedMonthlyFee:
        review.proposedMonthlyFee !== null ? String(review.proposedMonthlyFee) : "",
      currentPhaseStartDate: review.currentPhaseStartDate ?? "",
      monthsInCurrentPhase:
        review.monthsInCurrentPhase !== null ? String(review.monthsInCurrentPhase) : "",
      promotionEffectiveDate: review.promotionEffectiveDate,
      promotionCycleType: review.promotionCycleType,
      caseType: review.caseType,
      exceptionReason: review.exceptionReason ?? "",
      qualityReworkSummary: review.evidence.qualityReworkSummary ?? "",
      leadReviewSummary: review.evidence.leadReviewSummary ?? "",
      keyProjectsCompleted: emptySlots(review.evidence.keyProjectsCompleted),
      skillsDemonstrated: emptySlots(review.evidence.skillsDemonstrated, 4),
      independentDeliveryEvidence: review.evidence.independentDeliveryEvidence ?? "",
      mentoringLeadershipSignals: review.evidence.mentoringLeadershipSignals ?? "",
      repositoryLinks: emptySlots(review.evidence.repositoryLinks, 3),
      supportingFileIds: review.evidence.supportingFileIds,
      eligibilityChecklist: review.eligibilityChecklist.map((item) => ({
        ...item,
        evidence: item.evidence ?? "",
      })),
      leadRecommendation: review.leadRecommendation.recommendation,
      leadRecommendationSummary: review.leadRecommendation.summary ?? "",
      leadRecommendationConditions: review.leadRecommendation.conditions ?? "",
      initialAssignmentNextPhase: review.leadRecommendation.initialAssignmentNextPhase ?? "",
    });
    setMessage(null);
    setError(null);
  };

  const selectedMonthlyCandidate = candidates.find(
    (candidate) => candidate.id === monthlyForm.candidateId,
  );
  const selectedQuarterlyCandidate = candidates.find(
    (candidate) => candidate.id === quarterlyForm.candidateId,
  );
  const selectedPromotionCandidate = candidates.find(
    (candidate) => candidate.id === promotionForm.candidateId,
  );

  return (
    <AppShell
      contentClassName="kpi-reviews-page"
      title={isCandidate ? "KPI Feedback and Summaries" : "KPI Reviews and Summaries"}
    >
      {(error || message) && (
        <section className="feedback-row" aria-live="polite">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {message && <p className="form-success">{message}</p>}
        </section>
      )}

      <section className="card panel">
        <div className="review-switcher">
          <button
            className={`command-button ${activeView === "monthly" ? "primary" : ""}`}
            onClick={() => setActiveView("monthly")}
            type="button"
          >
            <ClipboardList size={18} aria-hidden="true" />
            Monthly Reviews
          </button>
          <button
            className={`command-button ${activeView === "quarterly" ? "primary" : ""}`}
            onClick={() => setActiveView("quarterly")}
            type="button"
          >
            <LineChart size={18} aria-hidden="true" />
            Quarterly Summaries
          </button>
          <button
            className={`command-button ${activeView === "promotion" ? "primary" : ""}`}
            onClick={() => setActiveView("promotion")}
            type="button"
          >
            <ArrowUpCircle size={18} aria-hidden="true" />
            Phase Promotions
          </button>
        </div>
      </section>

      {activeView === "monthly" ? (
        <section className="grid daily-logs-grid review-mode">
          {canManage && (
            <article className="card panel">
              <div className="section-header-row">
                <div>
                  <h2>
                    {editingMonthlyId ? "Edit Monthly KPI Review" : "Create Monthly KPI Review"}
                  </h2>
                  <p className="row-meta">
                    Structured monthly review based on the approved KPI form.
                  </p>
                </div>
                {editingMonthlyId && (
                  <button className="command-button" onClick={resetMonthlyForm} type="button">
                    <X size={18} aria-hidden="true" />
                    Cancel Edit
                  </button>
                )}
              </div>

              <form className="stack-form kpi-form" onSubmit={handleSubmitMonthlyReview}>
                <section className="kpi-form-section">
                  <h3>Review Details</h3>
                  <div className="kpi-form-grid">
                    <label>
                      Candidate
                      <select
                        className="plain-input"
                        disabled={Boolean(editingMonthlyId)}
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            candidateId: event.target.value,
                          }))
                        }
                        required
                        value={monthlyForm.candidateId}
                      >
                        <option value="">Select candidate</option>
                        {assignableCandidates.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Review period
                      <input
                        className="plain-input"
                        disabled={Boolean(editingMonthlyId)}
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            reviewPeriod: event.target.value,
                          }))
                        }
                        required
                        type="month"
                        value={monthlyForm.reviewPeriod}
                      />
                    </label>
                    <label>
                      Review date
                      <input
                        className="plain-input"
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            reviewDate: event.target.value,
                          }))
                        }
                        required
                        type="date"
                        value={monthlyForm.reviewDate}
                      />
                    </label>
                    <label>
                      Current phase
                      <input
                        className="plain-input"
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            currentPhase: event.target.value,
                          }))
                        }
                        required
                        value={monthlyForm.currentPhase}
                      />
                    </label>
                    <label>
                      Current designation
                      <input
                        className="plain-input"
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            currentDesignation: event.target.value,
                          }))
                        }
                        required
                        value={monthlyForm.currentDesignation}
                      />
                    </label>
                    <label>
                      Program start date
                      <input
                        className="plain-input"
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            programStartDate: event.target.value,
                          }))
                        }
                        type="date"
                        value={monthlyForm.programStartDate}
                      />
                    </label>
                    <label>
                      Months in current phase
                      <input
                        className="plain-input"
                        min="0"
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            monthsInCurrentPhase: Number(event.target.value),
                          }))
                        }
                        required
                        type="number"
                        value={monthlyForm.monthsInCurrentPhase}
                      />
                    </label>
                  </div>
                  {selectedMonthlyCandidate && (
                    <p className="row-meta">
                      {selectedMonthlyCandidate.programName}
                      {selectedMonthlyCandidate.batchName
                        ? ` / ${selectedMonthlyCandidate.batchName}`
                        : ""}
                    </p>
                  )}
                </section>

                <section className="kpi-form-section">
                  <h3>Hours and Attendance</h3>
                  <div className="kpi-form-grid">
                    <label>
                      Monthly target hours
                      <input
                        className="plain-input"
                        min="0"
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            attendanceSummary: {
                              ...current.attendanceSummary,
                              monthlyTargetHours: Number(event.target.value),
                            },
                          }))
                        }
                        required
                        type="number"
                        value={monthlyForm.attendanceSummary.monthlyTargetHours}
                      />
                    </label>
                    <label>
                      Actual hours logged
                      <input
                        className="plain-input"
                        min="0"
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            attendanceSummary: {
                              ...current.attendanceSummary,
                              actualHoursLogged: Number(event.target.value),
                            },
                          }))
                        }
                        required
                        step="0.5"
                        type="number"
                        value={monthlyForm.attendanceSummary.actualHoursLogged}
                      />
                    </label>
                    <label>
                      Working days available
                      <input
                        className="plain-input"
                        min="0"
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            attendanceSummary: {
                              ...current.attendanceSummary,
                              workingDaysAvailable: event.target.value,
                            },
                          }))
                        }
                        type="number"
                        value={monthlyForm.attendanceSummary.workingDaysAvailable}
                      />
                    </label>
                    <label>
                      Days absent
                      <input
                        className="plain-input"
                        min="0"
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            attendanceSummary: {
                              ...current.attendanceSummary,
                              daysAbsent: Number(event.target.value),
                            },
                          }))
                        }
                        required
                        type="number"
                        value={monthlyForm.attendanceSummary.daysAbsent}
                      />
                    </label>
                    <label>
                      Public holidays
                      <input
                        className="plain-input"
                        min="0"
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            attendanceSummary: {
                              ...current.attendanceSummary,
                              publicHolidays: Number(event.target.value),
                            },
                          }))
                        }
                        required
                        type="number"
                        value={monthlyForm.attendanceSummary.publicHolidays}
                      />
                    </label>
                    <label>
                      Non-availability days
                      <input
                        className="plain-input"
                        min="0"
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            attendanceSummary: {
                              ...current.attendanceSummary,
                              nonAvailabilityDays: Number(event.target.value),
                            },
                          }))
                        }
                        required
                        type="number"
                        value={monthlyForm.attendanceSummary.nonAvailabilityDays}
                      />
                    </label>
                    <label>
                      Compliance status
                      <select
                        className="plain-input"
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            attendanceSummary: {
                              ...current.attendanceSummary,
                              complianceStatus: event.target.value as ComplianceStatus,
                            },
                          }))
                        }
                        value={monthlyForm.attendanceSummary.complianceStatus}
                      >
                        <option value="full_compliance">Full compliance</option>
                        <option value="partial">Partial</option>
                        <option value="non_compliant">Non-compliant</option>
                      </select>
                    </label>
                  </div>
                </section>

                <section className="kpi-form-section">
                  <h3>KPI Scoring</h3>
                  <div className="daily-log-table-wrap">
                    <table className="daily-log-table">
                      <thead>
                        <tr>
                          <th>KPI</th>
                          <th>Description</th>
                          <th>Score / 10</th>
                          <th>Observation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyForm.scores.map((entry, index) => {
                          const criterion = KPI_CRITERIA[index] ?? KPI_CRITERIA[0];

                          return (
                            <tr key={entry.key}>
                              <td>{criterion.label}</td>
                              <td>{criterion.description}</td>
                              <td>
                                <input
                                  max="10"
                                  min="0"
                                  onChange={(event) =>
                                    updateMonthlyScoreRow(
                                      index,
                                      "score",
                                      Number(event.target.value),
                                    )
                                  }
                                  required
                                  type="number"
                                  value={entry.score}
                                />
                              </td>
                              <td>
                                <input
                                  onChange={(event) =>
                                    updateMonthlyScoreRow(index, "notes", event.target.value)
                                  }
                                  placeholder="Specific written observation"
                                  value={entry.notes ?? ""}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="kpi-form-section">
                  <h3>Performance Summary</h3>
                  <div className="kpi-summary-grid">
                    <div className="stack-form">
                      <label>
                        Top strength 1
                        <input
                          className="plain-input"
                          onChange={(event) =>
                            setMonthlySummaryListValue("topStrengths", 0, event.target.value)
                          }
                          value={monthlyForm.topStrengths[0]}
                        />
                      </label>
                      <label>
                        Top strength 2
                        <input
                          className="plain-input"
                          onChange={(event) =>
                            setMonthlySummaryListValue("topStrengths", 1, event.target.value)
                          }
                          value={monthlyForm.topStrengths[1]}
                        />
                      </label>
                      <label>
                        Top strength 3
                        <input
                          className="plain-input"
                          onChange={(event) =>
                            setMonthlySummaryListValue("topStrengths", 2, event.target.value)
                          }
                          value={monthlyForm.topStrengths[2]}
                        />
                      </label>
                    </div>
                    <div className="stack-form">
                      <label>
                        Improvement area 1
                        <input
                          className="plain-input"
                          onChange={(event) =>
                            setMonthlySummaryListValue("improvementAreas", 0, event.target.value)
                          }
                          value={monthlyForm.improvementAreas[0]}
                        />
                      </label>
                      <label>
                        Improvement area 2
                        <input
                          className="plain-input"
                          onChange={(event) =>
                            setMonthlySummaryListValue("improvementAreas", 1, event.target.value)
                          }
                          value={monthlyForm.improvementAreas[1]}
                        />
                      </label>
                      <label>
                        Improvement area 3
                        <input
                          className="plain-input"
                          onChange={(event) =>
                            setMonthlySummaryListValue("improvementAreas", 2, event.target.value)
                          }
                          value={monthlyForm.improvementAreas[2]}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="kpi-form-grid">
                    <label>
                      Notable achievements
                      <textarea
                        className="plain-input"
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            notableAchievements: event.target.value,
                          }))
                        }
                        rows={3}
                        value={monthlyForm.notableAchievements}
                      />
                    </label>
                    <label>
                      Quality issues or failures
                      <textarea
                        className="plain-input"
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            qualityIssues: event.target.value,
                          }))
                        }
                        rows={3}
                        value={monthlyForm.qualityIssues}
                      />
                    </label>
                    <label>
                      Feedback response and attitude
                      <textarea
                        className="plain-input"
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            feedbackResponse: event.target.value,
                          }))
                        }
                        rows={3}
                        value={monthlyForm.feedbackResponse}
                      />
                    </label>
                    <label>
                      Conduct concerns
                      <textarea
                        className="plain-input"
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            conductConcerns: event.target.value,
                          }))
                        }
                        rows={3}
                        value={monthlyForm.conductConcerns}
                      />
                    </label>
                  </div>
                </section>

                <section className="kpi-form-section">
                  <div className="section-header-row">
                    <h3>Improvement Directives</h3>
                    <button
                      className="command-button"
                      onClick={() =>
                        setMonthlyForm((current) => ({
                          ...current,
                          directives: [...current.directives, createDirectiveRow()],
                        }))
                      }
                      type="button"
                    >
                      <Plus size={18} aria-hidden="true" />
                      Add Directive
                    </button>
                  </div>

                  {monthlyForm.directives.length > 0 && (
                    <div className="daily-log-table-wrap">
                      <table className="daily-log-table">
                        <thead>
                          <tr>
                            <th>KPI</th>
                            <th>Directive</th>
                            <th>Measurement / Deadline</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyForm.directives.map((directive, index) => (
                            <tr key={`directive-${index}`}>
                              <td>
                                <select
                                  onChange={(event) =>
                                    updateDirective(index, "criterionKey", event.target.value)
                                  }
                                  value={directive.criterionKey}
                                >
                                  {KPI_CRITERIA.map((criterion) => (
                                    <option key={criterion.key} value={criterion.key}>
                                      {criterion.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  onChange={(event) =>
                                    updateDirective(index, "directive", event.target.value)
                                  }
                                  value={directive.directive}
                                />
                              </td>
                              <td>
                                <input
                                  onChange={(event) =>
                                    updateDirective(
                                      index,
                                      "measurementDeadline",
                                      event.target.value,
                                    )
                                  }
                                  value={directive.measurementDeadline}
                                />
                              </td>
                              <td>
                                <button
                                  className="command-button"
                                  onClick={() => removeDirective(index)}
                                  type="button"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="kpi-toggle-grid">
                    <label className="toggle-label">
                      <input
                        checked={monthlyForm.pipConsideration}
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            pipConsideration: event.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      PIP consideration
                    </label>
                    <label>
                      Next review date
                      <input
                        className="plain-input"
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            nextReviewDate: event.target.value,
                          }))
                        }
                        type="date"
                        value={monthlyForm.nextReviewDate}
                      />
                    </label>
                  </div>
                </section>

                <section className="kpi-form-section">
                  <h3>Promotion Signal</h3>
                  <div className="kpi-toggle-grid">
                    <label className="toggle-label">
                      <input
                        checked={monthlyForm.promotionWatch}
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            promotionWatch: event.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      Promotion watch
                    </label>
                    <label className="toggle-label">
                      <input
                        checked={monthlyForm.readyForPromotion}
                        onChange={(event) =>
                          setMonthlyForm((current) => ({
                            ...current,
                            readyForPromotion: event.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      Ready for promotion consideration
                    </label>
                  </div>
                </section>

                {canSeeFeeRecommendation && (
                  <section className="kpi-form-section">
                    <h3>Fee Recommendation</h3>
                    <div className="kpi-form-grid">
                      <label>
                        Decision
                        <select
                          className="plain-input"
                          onChange={(event) =>
                            setMonthlyForm((current) => ({
                              ...current,
                              feeDecision: event.target.value as KpiFeeRecommendation["decision"],
                            }))
                          }
                          value={monthlyForm.feeDecision}
                        >
                          <option value="maintain">Maintain current fee</option>
                          <option value="increment">Increment fee</option>
                          <option value="hold">Hold pending improvement</option>
                        </select>
                      </label>
                      <label>
                        Increment amount
                        <input
                          className="plain-input"
                          min="0"
                          onChange={(event) =>
                            setMonthlyForm((current) => ({
                              ...current,
                              feeIncrementAmount: event.target.value,
                            }))
                          }
                          step="1"
                          type="number"
                          value={monthlyForm.feeIncrementAmount}
                        />
                      </label>
                      <label className="kpi-form-wide">
                        Justification
                        <textarea
                          className="plain-input"
                          onChange={(event) =>
                            setMonthlyForm((current) => ({
                              ...current,
                              feeJustification: event.target.value,
                            }))
                          }
                          rows={3}
                          value={monthlyForm.feeJustification}
                        />
                      </label>
                    </div>
                  </section>
                )}

                <section className="kpi-form-section">
                  <h3>Overall Feedback</h3>
                  <label>
                    General feedback
                    <textarea
                      className="plain-input"
                      onChange={(event) =>
                        setMonthlyForm((current) => ({
                          ...current,
                          feedback: event.target.value,
                        }))
                      }
                      rows={4}
                      value={monthlyForm.feedback}
                    />
                  </label>
                </section>

                <button className="command-button primary" disabled={isBusy} type="submit">
                  <Send size={18} aria-hidden="true" />
                  {editingMonthlyId ? "Update Draft Review" : "Save Draft Review"}
                </button>
              </form>
            </article>
          )}

          <article className="card panel">
            <h2>{isCandidate ? "My Monthly KPI Feedback" : "Monthly Review Queue"}</h2>
            {!isCandidate && (
              <form
                className="filter-bar timesheet-filters"
                onSubmit={(event) => {
                  event.preventDefault();
                  void loadMonthlyReviews(monthlyFilters).catch((loadError) => {
                    setError(
                      loadError instanceof Error
                        ? loadError.message
                        : "Failed to filter monthly reviews.",
                    );
                  });
                }}
              >
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setMonthlyFilters((current) => ({
                      ...current,
                      programId: event.target.value,
                      batchId: "",
                      candidateId: "",
                    }))
                  }
                  value={monthlyFilters.programId}
                >
                  <option value="">All programs</option>
                  {candidateOptions.programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setMonthlyFilters((current) => ({
                      ...current,
                      batchId: event.target.value,
                      candidateId: "",
                    }))
                  }
                  value={monthlyFilters.batchId}
                >
                  <option value="">All batches</option>
                  {availableBatchesForMonthly.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name}
                    </option>
                  ))}
                </select>
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setMonthlyFilters((current) => ({
                      ...current,
                      candidateId: event.target.value,
                    }))
                  }
                  value={monthlyFilters.candidateId}
                >
                  <option value="">All candidates</option>
                  {availableCandidatesForMonthly.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.label}
                    </option>
                  ))}
                </select>
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setMonthlyFilters((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  value={monthlyFilters.status}
                >
                  <option value="">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="approved">Completed</option>
                </select>
                <input
                  className="plain-input"
                  onChange={(event) =>
                    setMonthlyFilters((current) => ({
                      ...current,
                      reviewPeriod: event.target.value,
                    }))
                  }
                  type="month"
                  value={monthlyFilters.reviewPeriod}
                />
                <button className="command-button primary" type="submit">
                  <Filter size={18} aria-hidden="true" />
                  Filter
                </button>
              </form>
            )}

            <div className="daily-log-list">
              {kpiReviews.length === 0 && <p className="row-meta">No monthly KPI reviews found.</p>}
              {kpiReviews.map((review) => (
                <div className="daily-log-row kpi-review-card" key={review.id}>
                  <div className="daily-log-main">
                    <div>
                      <p className="row-title">
                        {review.fullName} / {review.reviewPeriod}
                      </p>
                      <p className="row-meta">
                        {review.programName}
                        {review.batchName ? ` / ${review.batchName}` : ""}
                      </p>
                      <p className="row-meta">
                        Reviewer: {review.reviewerName}
                        {review.overallScore !== null
                          ? ` / Score ${review.overallScore}/100 (${(
                              review.overallScore / 10
                            ).toFixed(1)}/10)`
                          : ""}
                      </p>
                    </div>
                    <span className={`status ${review.status === "approved" ? "success" : ""}`}>
                      {review.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div className="kpi-detail-grid">
                    <p className="row-meta">
                      <strong>Phase:</strong> {review.currentPhase || "-"}
                    </p>
                    <p className="row-meta">
                      <strong>Designation:</strong> {review.currentDesignation || "-"}
                    </p>
                    <p className="row-meta">
                      <strong>Review date:</strong> {review.reviewDate || "-"}
                    </p>
                    <p className="row-meta">
                      <strong>Rating:</strong> {formatOverallRating(review.summary.overallRating)}
                    </p>
                  </div>

                  <div className="submitted-log-table-wrap">
                    <table className="submitted-log-table">
                      <thead>
                        <tr>
                          <th>KPI</th>
                          <th>Score</th>
                          <th>Observation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {review.scores.map((entry) => (
                          <tr key={`${review.id}-${entry.key}`}>
                            <td>{entry.criterion}</td>
                            <td>
                              {entry.score}/{entry.maxScore}
                            </td>
                            <td>{entry.notes || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="kpi-detail-grid">
                    <p className="row-meta">
                      <strong>Hours:</strong> {review.attendanceSummary.actualHoursLogged} /{" "}
                      {review.attendanceSummary.monthlyTargetHours}
                    </p>
                    <p className="row-meta">
                      <strong>Compliance:</strong>{" "}
                      {formatComplianceStatus(review.attendanceSummary.complianceStatus)}
                    </p>
                    <p className="row-meta">
                      <strong>Variance:</strong> {review.attendanceSummary.varianceHours} hours
                    </p>
                    <p className="row-meta">
                      <strong>PIP:</strong>{" "}
                      {review.improvementPlan.pipConsideration ? "Consider" : "No"}
                    </p>
                  </div>

                  {(review.summary.topStrengths.length > 0 ||
                    review.summary.improvementAreas.length > 0) && (
                    <div className="kpi-summary-grid compact">
                      <div>
                        <p className="row-title small">Top strengths</p>
                        <ul className="kpi-tag-list">
                          {review.summary.topStrengths.length === 0 && <li>-</li>}
                          {review.summary.topStrengths.map((item, index) => (
                            <li key={`strength-${review.id}-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="row-title small">Improvement areas</p>
                        <ul className="kpi-tag-list">
                          {review.summary.improvementAreas.length === 0 && <li>-</li>}
                          {review.summary.improvementAreas.map((item, index) => (
                            <li key={`improvement-${review.id}-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {(review.summary.notableAchievements ||
                    review.summary.qualityIssues ||
                    review.summary.feedbackResponse ||
                    review.summary.conductConcerns ||
                    review.feedback) && (
                    <div className="stack-form">
                      {review.summary.notableAchievements && (
                        <p className="row-meta">
                          <strong>Achievements:</strong> {review.summary.notableAchievements}
                        </p>
                      )}
                      {review.summary.qualityIssues && (
                        <p className="row-meta">
                          <strong>Quality issues:</strong> {review.summary.qualityIssues}
                        </p>
                      )}
                      {review.summary.feedbackResponse && (
                        <p className="row-meta">
                          <strong>Feedback response:</strong> {review.summary.feedbackResponse}
                        </p>
                      )}
                      {review.summary.conductConcerns && (
                        <p className="row-meta">
                          <strong>Conduct concerns:</strong> {review.summary.conductConcerns}
                        </p>
                      )}
                      {review.feedback && (
                        <p className="row-meta">
                          <strong>General feedback:</strong> {review.feedback}
                        </p>
                      )}
                    </div>
                  )}

                  {review.improvementPlan.directives.length > 0 && (
                    <div className="submitted-log-table-wrap">
                      <table className="submitted-log-table">
                        <thead>
                          <tr>
                            <th>KPI</th>
                            <th>Directive</th>
                            <th>Measurement / Deadline</th>
                          </tr>
                        </thead>
                        <tbody>
                          {review.improvementPlan.directives.map((directive, index) => (
                            <tr key={`directive-view-${review.id}-${index}`}>
                              <td>{directive.criterionLabel}</td>
                              <td>{directive.directive}</td>
                              <td>{directive.measurementDeadline}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {review.linkedEvidence && (
                    <LinkedEvidencePanel linkedEvidence={review.linkedEvidence} />
                  )}

                  {(review.promotionSignal.promotionWatch ||
                    review.promotionSignal.readyForPromotion ||
                    (canSeeFeeRecommendation && review.feeRecommendation)) && (
                    <div className="kpi-detail-grid">
                      <p className="row-meta">
                        <strong>Promotion watch:</strong>{" "}
                        {review.promotionSignal.promotionWatch ? "Yes" : "No"}
                      </p>
                      <p className="row-meta">
                        <strong>Ready for promotion consideration:</strong>{" "}
                        {review.promotionSignal.readyForPromotion ? "Yes" : "No"}
                      </p>
                      {canSeeFeeRecommendation && review.feeRecommendation && (
                        <p className="row-meta">
                          <strong>Fee recommendation:</strong>{" "}
                          {review.feeRecommendation.decision}
                          {review.feeRecommendation.incrementAmount !== null
                            ? ` (${review.feeRecommendation.incrementAmount})`
                            : ""}
                        </p>
                      )}
                    </div>
                  )}

                  {canManage && review.status === "draft" && (
                    <div className="review-controls">
                      <button
                        className="command-button"
                        disabled={isBusy}
                        onClick={() => handleEditMonthlyDraft(review)}
                        type="button"
                      >
                        <Pencil size={18} aria-hidden="true" />
                        Edit Draft
                      </button>
                      <button
                        className="command-button primary"
                        disabled={isBusy}
                        onClick={() => void handleCompleteMonthlyReview(review)}
                        type="button"
                      >
                        <CheckCircle2 size={18} aria-hidden="true" />
                        Complete Review
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : activeView === "quarterly" ? (
        <section className="grid daily-logs-grid review-mode">
          {canManage && (
            <article className="card panel">
              <div className="section-header-row">
                <div>
                  <h2>
                    {editingQuarterlyId
                      ? "Edit Quarterly KPI Summary"
                      : "Create Quarterly KPI Summary"}
                  </h2>
                  <p className="row-meta">
                    Quarterly summary reuses monthly KPI and workflow evidence.
                  </p>
                </div>
                {editingQuarterlyId && (
                  <button className="command-button" onClick={resetQuarterlyForm} type="button">
                    <X size={18} aria-hidden="true" />
                    Cancel Edit
                  </button>
                )}
              </div>

              <form className="stack-form kpi-form" onSubmit={handleSubmitQuarterlySummary}>
                <section className="kpi-form-section">
                  <h3>Review Details</h3>
                  <div className="kpi-form-grid">
                    <label>
                      Candidate
                      <select
                        className="plain-input"
                        disabled={Boolean(editingQuarterlyId)}
                        onChange={(event) =>
                          setQuarterlyForm((current) => ({
                            ...current,
                            candidateId: event.target.value,
                          }))
                        }
                        required
                        value={quarterlyForm.candidateId}
                      >
                        <option value="">Select candidate</option>
                        {assignableCandidates.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Review year
                      <input
                        className="plain-input"
                        disabled={Boolean(editingQuarterlyId)}
                        min="2000"
                        onChange={(event) =>
                          setQuarterlyForm((current) => ({
                            ...current,
                            reviewYear: event.target.value,
                          }))
                        }
                        required
                        type="number"
                        value={quarterlyForm.reviewYear}
                      />
                    </label>
                    <label>
                      Quarter
                      <select
                        className="plain-input"
                        disabled={Boolean(editingQuarterlyId)}
                        onChange={(event) =>
                          setQuarterlyForm((current) => ({
                            ...current,
                            reviewQuarter: event.target.value,
                          }))
                        }
                        required
                        value={quarterlyForm.reviewQuarter}
                      >
                        <option value="">Select quarter</option>
                        <option value="1">Q1</option>
                        <option value="2">Q2</option>
                        <option value="3">Q3</option>
                        <option value="4">Q4</option>
                      </select>
                    </label>
                    <label>
                      Review date
                      <input
                        className="plain-input"
                        onChange={(event) =>
                          setQuarterlyForm((current) => ({
                            ...current,
                            reviewDate: event.target.value,
                          }))
                        }
                        required
                        type="date"
                        value={quarterlyForm.reviewDate}
                      />
                    </label>
                    <label>
                      Current phase
                      <input
                        className="plain-input"
                        onChange={(event) =>
                          setQuarterlyForm((current) => ({
                            ...current,
                            currentPhase: event.target.value,
                          }))
                        }
                        required
                        value={quarterlyForm.currentPhase}
                      />
                    </label>
                    <label>
                      Current designation
                      <input
                        className="plain-input"
                        onChange={(event) =>
                          setQuarterlyForm((current) => ({
                            ...current,
                            currentDesignation: event.target.value,
                          }))
                        }
                        required
                        value={quarterlyForm.currentDesignation}
                      />
                    </label>
                  </div>
                  {selectedQuarterlyCandidate && (
                    <p className="row-meta">
                      {selectedQuarterlyCandidate.programName}
                      {selectedQuarterlyCandidate.batchName
                        ? ` / ${selectedQuarterlyCandidate.batchName}`
                        : ""}
                    </p>
                  )}
                </section>

                <section className="kpi-form-section">
                  <h3>Quarterly Assessment</h3>
                  <div className="kpi-summary-grid">
                    <div className="stack-form">
                      <label>
                        Strength 1
                        <input
                          className="plain-input"
                          onChange={(event) =>
                            setQuarterlyListValue("strengths", 0, event.target.value)
                          }
                          value={quarterlyForm.strengths[0]}
                        />
                      </label>
                      <label>
                        Strength 2
                        <input
                          className="plain-input"
                          onChange={(event) =>
                            setQuarterlyListValue("strengths", 1, event.target.value)
                          }
                          value={quarterlyForm.strengths[1]}
                        />
                      </label>
                      <label>
                        Strength 3
                        <input
                          className="plain-input"
                          onChange={(event) =>
                            setQuarterlyListValue("strengths", 2, event.target.value)
                          }
                          value={quarterlyForm.strengths[2]}
                        />
                      </label>
                    </div>
                    <div className="stack-form">
                      <label>
                        Improvement priority 1
                        <input
                          className="plain-input"
                          onChange={(event) =>
                            setQuarterlyListValue(
                              "improvementPriorities",
                              0,
                              event.target.value,
                            )
                          }
                          value={quarterlyForm.improvementPriorities[0]}
                        />
                      </label>
                      <label>
                        Improvement priority 2
                        <input
                          className="plain-input"
                          onChange={(event) =>
                            setQuarterlyListValue(
                              "improvementPriorities",
                              1,
                              event.target.value,
                            )
                          }
                          value={quarterlyForm.improvementPriorities[1]}
                        />
                      </label>
                      <label>
                        Improvement priority 3
                        <input
                          className="plain-input"
                          onChange={(event) =>
                            setQuarterlyListValue(
                              "improvementPriorities",
                              2,
                              event.target.value,
                            )
                          }
                          value={quarterlyForm.improvementPriorities[2]}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="kpi-form-grid">
                    <label>
                      Technical growth summary
                      <textarea
                        className="plain-input"
                        onChange={(event) =>
                          setQuarterlyForm((current) => ({
                            ...current,
                            technicalGrowthSummary: event.target.value,
                          }))
                        }
                        rows={3}
                        value={quarterlyForm.technicalGrowthSummary}
                      />
                    </label>
                    <label>
                      Delivery consistency summary
                      <textarea
                        className="plain-input"
                        onChange={(event) =>
                          setQuarterlyForm((current) => ({
                            ...current,
                            deliveryConsistencySummary: event.target.value,
                          }))
                        }
                        rows={3}
                        value={quarterlyForm.deliveryConsistencySummary}
                      />
                    </label>
                    <label>
                      Communication and collaboration summary
                      <textarea
                        className="plain-input"
                        onChange={(event) =>
                          setQuarterlyForm((current) => ({
                            ...current,
                            communicationCollaborationSummary: event.target.value,
                          }))
                        }
                        rows={3}
                        value={quarterlyForm.communicationCollaborationSummary}
                      />
                    </label>
                    <label>
                      Ownership and independence summary
                      <textarea
                        className="plain-input"
                        onChange={(event) =>
                          setQuarterlyForm((current) => ({
                            ...current,
                            ownershipIndependenceSummary: event.target.value,
                          }))
                        }
                        rows={3}
                        value={quarterlyForm.ownershipIndependenceSummary}
                      />
                    </label>
                    <label>
                      Review responsiveness summary
                      <textarea
                        className="plain-input"
                        onChange={(event) =>
                          setQuarterlyForm((current) => ({
                            ...current,
                            reviewResponsivenessSummary: event.target.value,
                          }))
                        }
                        rows={3}
                        value={quarterlyForm.reviewResponsivenessSummary}
                      />
                    </label>
                    <label>
                      Risk flags
                      <textarea
                        className="plain-input"
                        onChange={(event) =>
                          setQuarterlyForm((current) => ({
                            ...current,
                            riskFlags: event.target.value,
                          }))
                        }
                        rows={3}
                        value={quarterlyForm.riskFlags}
                      />
                    </label>
                    <label className="kpi-form-wide">
                      Recommended focus for next quarter
                      <textarea
                        className="plain-input"
                        onChange={(event) =>
                          setQuarterlyForm((current) => ({
                            ...current,
                            recommendedFocus: event.target.value,
                          }))
                        }
                        rows={3}
                        value={quarterlyForm.recommendedFocus}
                      />
                    </label>
                  </div>
                </section>

                <section className="kpi-form-section">
                  <h3>Action Plan</h3>
                  <div className="kpi-form-grid">
                    <label>
                      Next quarter goals
                      <textarea
                        className="plain-input"
                        onChange={(event) =>
                          setQuarterlyForm((current) => ({
                            ...current,
                            nextQuarterGoals: event.target.value,
                          }))
                        }
                        rows={3}
                        value={quarterlyForm.nextQuarterGoals}
                      />
                    </label>
                    <label>
                      Expected skill improvements
                      <textarea
                        className="plain-input"
                        onChange={(event) =>
                          setQuarterlyForm((current) => ({
                            ...current,
                            expectedSkillImprovements: event.target.value,
                          }))
                        }
                        rows={3}
                        value={quarterlyForm.expectedSkillImprovements}
                      />
                    </label>
                    <label>
                      Expected delivery improvements
                      <textarea
                        className="plain-input"
                        onChange={(event) =>
                          setQuarterlyForm((current) => ({
                            ...current,
                            expectedDeliveryImprovements: event.target.value,
                          }))
                        }
                        rows={3}
                        value={quarterlyForm.expectedDeliveryImprovements}
                      />
                    </label>
                    <label>
                      Support required from lead or admin
                      <textarea
                        className="plain-input"
                        onChange={(event) =>
                          setQuarterlyForm((current) => ({
                            ...current,
                            supportRequired: event.target.value,
                          }))
                        }
                        rows={3}
                        value={quarterlyForm.supportRequired}
                      />
                    </label>
                    <label>
                      Follow-up date
                      <input
                        className="plain-input"
                        onChange={(event) =>
                          setQuarterlyForm((current) => ({
                            ...current,
                            followUpDate: event.target.value,
                          }))
                        }
                        type="date"
                        value={quarterlyForm.followUpDate}
                      />
                    </label>
                    <label>
                      Outcome
                      <select
                        className="plain-input"
                        onChange={(event) =>
                          setQuarterlyForm((current) => ({
                            ...current,
                            outcome: event.target.value as QuarterlyFormState["outcome"],
                          }))
                        }
                        value={quarterlyForm.outcome}
                      >
                        <option value="">Select outcome</option>
                        {quarterlyOutcomes.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                <section className="kpi-form-section">
                  <h3>General Feedback</h3>
                  <label>
                    Quarterly feedback
                    <textarea
                      className="plain-input"
                      onChange={(event) =>
                        setQuarterlyForm((current) => ({
                          ...current,
                          feedback: event.target.value,
                        }))
                      }
                      rows={4}
                      value={quarterlyForm.feedback}
                    />
                  </label>
                </section>

                <button className="command-button primary" disabled={isBusy} type="submit">
                  <Send size={18} aria-hidden="true" />
                  {editingQuarterlyId ? "Update Quarterly Draft" : "Save Quarterly Draft"}
                </button>
              </form>
            </article>
          )}

          <article className="card panel">
            <h2>{isCandidate ? "My Quarterly Summaries" : "Quarterly Summary Queue"}</h2>
            {!isCandidate && (
              <form
                className="filter-bar timesheet-filters"
                onSubmit={(event) => {
                  event.preventDefault();
                  void loadQuarterlySummaries(quarterlyFilters).catch((loadError) => {
                    setError(
                      loadError instanceof Error
                        ? loadError.message
                        : "Failed to filter quarterly summaries.",
                    );
                  });
                }}
              >
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setQuarterlyFilters((current) => ({
                      ...current,
                      programId: event.target.value,
                      batchId: "",
                      candidateId: "",
                    }))
                  }
                  value={quarterlyFilters.programId}
                >
                  <option value="">All programs</option>
                  {candidateOptions.programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setQuarterlyFilters((current) => ({
                      ...current,
                      batchId: event.target.value,
                      candidateId: "",
                    }))
                  }
                  value={quarterlyFilters.batchId}
                >
                  <option value="">All batches</option>
                  {availableBatchesForQuarterly.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name}
                    </option>
                  ))}
                </select>
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setQuarterlyFilters((current) => ({
                      ...current,
                      candidateId: event.target.value,
                    }))
                  }
                  value={quarterlyFilters.candidateId}
                >
                  <option value="">All candidates</option>
                  {availableCandidatesForQuarterly.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.label}
                    </option>
                  ))}
                </select>
                <input
                  className="plain-input"
                  onChange={(event) =>
                    setQuarterlyFilters((current) => ({
                      ...current,
                      reviewYear: event.target.value,
                    }))
                  }
                  placeholder="Year"
                  type="number"
                  value={quarterlyFilters.reviewYear}
                />
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setQuarterlyFilters((current) => ({
                      ...current,
                      reviewQuarter: event.target.value,
                    }))
                  }
                  value={quarterlyFilters.reviewQuarter}
                >
                  <option value="">All quarters</option>
                  <option value="1">Q1</option>
                  <option value="2">Q2</option>
                  <option value="3">Q3</option>
                  <option value="4">Q4</option>
                </select>
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setQuarterlyFilters((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  value={quarterlyFilters.status}
                >
                  <option value="">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="approved">Completed</option>
                </select>
                <button className="command-button primary" type="submit">
                  <Filter size={18} aria-hidden="true" />
                  Filter
                </button>
              </form>
            )}

            <div className="daily-log-list">
              {quarterlySummaries.length === 0 && (
                <p className="row-meta">No quarterly KPI summaries found.</p>
              )}
              {quarterlySummaries.map((summary) => (
                <div className="daily-log-row kpi-review-card" key={summary.id}>
                  <div className="daily-log-main">
                    <div>
                      <p className="row-title">
                        {summary.fullName} / Q{summary.reviewQuarter} {summary.reviewYear}
                      </p>
                      <p className="row-meta">
                        {summary.programName}
                        {summary.batchName ? ` / ${summary.batchName}` : ""}
                      </p>
                      <p className="row-meta">
                        Reviewer: {summary.reviewerName}
                        {summary.rollup.quarterlyAverageScore !== null
                          ? ` / Quarterly average ${summary.rollup.quarterlyAverageScore}/100`
                          : ""}
                      </p>
                    </div>
                    <span className={`status ${summary.status === "approved" ? "success" : ""}`}>
                      {summary.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div className="kpi-detail-grid">
                    <p className="row-meta">
                      <strong>Period:</strong> {summary.reviewPeriodStart} to{" "}
                      {summary.reviewPeriodEnd}
                    </p>
                    <p className="row-meta">
                      <strong>Phase:</strong> {summary.currentPhase || "-"}
                    </p>
                    <p className="row-meta">
                      <strong>Designation:</strong> {summary.currentDesignation || "-"}
                    </p>
                    <p className="row-meta">
                      <strong>Outcome:</strong>{" "}
                      {summary.outcome ? formatQuarterlyOutcome(summary.outcome) : "-"}
                    </p>
                  </div>

                  <div className="submitted-log-table-wrap">
                    <table className="submitted-log-table">
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Monthly KPI Average</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.rollup.monthlyAverageScores.length === 0 && (
                          <tr>
                            <td colSpan={2}>No completed monthly KPI reviews in this quarter.</td>
                          </tr>
                        )}
                        {summary.rollup.monthlyAverageScores.map((item) => {
                          const linkedReview = summary.rollup.linkedMonthlyKpiReviews.find(
                            (review) => review.reviewPeriod === item.reviewPeriod,
                          );

                          return (
                            <tr key={`${summary.id}-${item.reviewPeriod}`}>
                              <td>
                                {item.reviewPeriod}
                                {linkedReview ? ` (${linkedReview.status.replaceAll("_", " ")})` : ""}
                              </td>
                              <td>{item.overallScore}/100</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {summary.rollup.workflowSummaries && (
                    <div className="kpi-detail-grid">
                      <p className="row-meta">
                        <strong>Timesheet trend:</strong>{" "}
                        {summary.rollup.workflowSummaries.timesheetSubmissionSummary ?? "-"}
                      </p>
                      <p className="row-meta">
                        <strong>Daily log consistency:</strong>{" "}
                        {summary.rollup.workflowSummaries.dailyLogConsistencySummary ?? "-"}
                      </p>
                      <p className="row-meta">
                        <strong>Task completion:</strong>{" "}
                        {summary.rollup.workflowSummaries.taskCompletionSummary ?? "-"}
                      </p>
                      <p className="row-meta">
                        <strong>Call engagement:</strong>{" "}
                        {summary.rollup.workflowSummaries.callEngagementSummary ?? "-"}
                      </p>
                    </div>
                  )}

                  {summary.linkedEvidence && (
                    <LinkedEvidencePanel linkedEvidence={summary.linkedEvidence} />
                  )}

                  <div className="kpi-detail-grid">
                    <p className="row-meta">
                      <strong>Total quarterly hours:</strong> {summary.rollup.totalQuarterlyHours}
                    </p>
                    <p className="row-meta">
                      <strong>Average monthly hours:</strong>{" "}
                      {summary.rollup.averageMonthlyHours}
                    </p>
                    <p className="row-meta">
                      <strong>Timesheets:</strong> {summary.rollup.approvedTimesheetCount}/
                      {summary.rollup.timesheetCount} approved
                    </p>
                    <p className="row-meta">
                      <strong>Daily logs:</strong> {summary.rollup.approvedDailyLogCount}/
                      {summary.rollup.dailyLogCount} approved
                    </p>
                    <p className="row-meta">
                      <strong>Tasks approved:</strong> {summary.rollup.taskApprovedCount}
                    </p>
                    <p className="row-meta">
                      <strong>Task revisions:</strong> {summary.rollup.taskRevisionCount}
                    </p>
                    <p className="row-meta">
                      <strong>Calls:</strong> {summary.rollup.callCount}
                    </p>
                    <p className="row-meta">
                      <strong>Cancelled calls:</strong> {summary.rollup.cancelledCallCount}
                    </p>
                  </div>

                  {(summary.assessment.strengths.length > 0 ||
                    summary.assessment.improvementPriorities.length > 0) && (
                    <div className="kpi-summary-grid compact">
                      <div>
                        <p className="row-title small">Strengths</p>
                        <ul className="kpi-tag-list">
                          {summary.assessment.strengths.length === 0 && <li>-</li>}
                          {summary.assessment.strengths.map((item, index) => (
                            <li key={`quarterly-strength-${summary.id}-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="row-title small">Improvement priorities</p>
                        <ul className="kpi-tag-list">
                          {summary.assessment.improvementPriorities.length === 0 && <li>-</li>}
                          {summary.assessment.improvementPriorities.map((item, index) => (
                            <li key={`quarterly-improvement-${summary.id}-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="stack-form">
                    {summary.assessment.technicalGrowthSummary && (
                      <p className="row-meta">
                        <strong>Technical growth:</strong>{" "}
                        {summary.assessment.technicalGrowthSummary}
                      </p>
                    )}
                    {summary.assessment.deliveryConsistencySummary && (
                      <p className="row-meta">
                        <strong>Delivery consistency:</strong>{" "}
                        {summary.assessment.deliveryConsistencySummary}
                      </p>
                    )}
                    {summary.assessment.communicationCollaborationSummary && (
                      <p className="row-meta">
                        <strong>Communication and collaboration:</strong>{" "}
                        {summary.assessment.communicationCollaborationSummary}
                      </p>
                    )}
                    {summary.assessment.ownershipIndependenceSummary && (
                      <p className="row-meta">
                        <strong>Ownership and independence:</strong>{" "}
                        {summary.assessment.ownershipIndependenceSummary}
                      </p>
                    )}
                    {summary.assessment.reviewResponsivenessSummary && (
                      <p className="row-meta">
                        <strong>Review responsiveness:</strong>{" "}
                        {summary.assessment.reviewResponsivenessSummary}
                      </p>
                    )}
                    {summary.assessment.riskFlags && (
                      <p className="row-meta">
                        <strong>Risk flags:</strong> {summary.assessment.riskFlags}
                      </p>
                    )}
                    {summary.assessment.recommendedFocus && (
                      <p className="row-meta">
                        <strong>Recommended focus:</strong>{" "}
                        {summary.assessment.recommendedFocus}
                      </p>
                    )}
                    {summary.feedback && (
                      <p className="row-meta">
                        <strong>General feedback:</strong> {summary.feedback}
                      </p>
                    )}
                  </div>

                  <div className="stack-form">
                    {summary.actionPlan.nextQuarterGoals && (
                      <p className="row-meta">
                        <strong>Next quarter goals:</strong>{" "}
                        {summary.actionPlan.nextQuarterGoals}
                      </p>
                    )}
                    {summary.actionPlan.expectedSkillImprovements && (
                      <p className="row-meta">
                        <strong>Expected skill improvements:</strong>{" "}
                        {summary.actionPlan.expectedSkillImprovements}
                      </p>
                    )}
                    {summary.actionPlan.expectedDeliveryImprovements && (
                      <p className="row-meta">
                        <strong>Expected delivery improvements:</strong>{" "}
                        {summary.actionPlan.expectedDeliveryImprovements}
                      </p>
                    )}
                    {summary.actionPlan.supportRequired && (
                      <p className="row-meta">
                        <strong>Support required:</strong>{" "}
                        {summary.actionPlan.supportRequired}
                      </p>
                    )}
                    {summary.actionPlan.followUpDate && (
                      <p className="row-meta">
                        <strong>Follow-up date:</strong> {summary.actionPlan.followUpDate}
                      </p>
                    )}
                  </div>

                  {canManage && summary.status === "draft" && (
                    <div className="review-controls">
                      <button
                        className="command-button"
                        disabled={isBusy}
                        onClick={() => handleEditQuarterlyDraft(summary)}
                        type="button"
                      >
                        <Pencil size={18} aria-hidden="true" />
                        Edit Draft
                      </button>
                      <button
                        className="command-button primary"
                        disabled={isBusy}
                        onClick={() => void handleCompleteQuarterlySummary(summary)}
                        type="button"
                      >
                        <CheckCircle2 size={18} aria-hidden="true" />
                        Complete Summary
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : (
        <section className="grid daily-logs-grid review-mode">
          {canManage && (
            <article className="card panel">
              <div className="section-header-row">
                <div>
                  <h2>
                    {editingPromotionId
                      ? "Edit Phase Promotion Review"
                      : "Create Phase Promotion Review"}
                  </h2>
                  <p className="row-meta">
                    Promotion workflow for actual phase movement decisions only.
                  </p>
                </div>
                {editingPromotionId && (
                  <button className="command-button" onClick={resetPromotionForm} type="button">
                    <X size={18} aria-hidden="true" />
                    Cancel Edit
                  </button>
                )}
              </div>

              <form className="stack-form kpi-form" onSubmit={handleSubmitPromotionReview}>
                <section className="kpi-form-section">
                  <h3>Promotion Details</h3>
                  <div className="kpi-form-grid">
                    <label>
                      Candidate
                      <select
                        className="plain-input"
                        disabled={Boolean(editingPromotionId)}
                        onChange={(event) =>
                          setPromotionForm((current) => ({
                            ...current,
                            candidateId: event.target.value,
                          }))
                        }
                        required
                        value={promotionForm.candidateId}
                      >
                        <option value="">Select candidate</option>
                        {assignableCandidates.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Prepared date
                      <input
                        className="plain-input"
                        onChange={(event) =>
                          setPromotionForm((current) => ({
                            ...current,
                            preparedDate: event.target.value,
                          }))
                        }
                        required
                        type="date"
                        value={promotionForm.preparedDate}
                      />
                    </label>
                    <label>
                      Current phase
                      <input
                        className="plain-input"
                        onChange={(event) =>
                          setPromotionForm((current) => ({
                            ...current,
                            currentPhase: event.target.value,
                          }))
                        }
                        required
                        value={promotionForm.currentPhase}
                      />
                    </label>
                    <label>
                      Current designation
                      <input
                        className="plain-input"
                        onChange={(event) =>
                          setPromotionForm((current) => ({
                            ...current,
                            currentDesignation: event.target.value,
                          }))
                        }
                        required
                        value={promotionForm.currentDesignation}
                      />
                    </label>
                    <label>
                      Proposed next phase
                      <input
                        className="plain-input"
                        onChange={(event) =>
                          setPromotionForm((current) => ({
                            ...current,
                            proposedNextPhase: event.target.value,
                          }))
                        }
                        required
                        value={promotionForm.proposedNextPhase}
                      />
                    </label>
                    <label>
                      Proposed next designation
                      <input
                        className="plain-input"
                        onChange={(event) =>
                          setPromotionForm((current) => ({
                            ...current,
                            proposedNextDesignation: event.target.value,
                          }))
                        }
                        required
                        value={promotionForm.proposedNextDesignation}
                      />
                    </label>
                    <label>
                      Current monthly fee
                      <input
                        className="plain-input"
                        min="0"
                        onChange={(event) =>
                          setPromotionForm((current) => ({
                            ...current,
                            currentMonthlyFee: event.target.value,
                          }))
                        }
                        type="number"
                        value={promotionForm.currentMonthlyFee}
                      />
                    </label>
                    <label>
                      Proposed monthly fee
                      <input
                        className="plain-input"
                        min="0"
                        onChange={(event) =>
                          setPromotionForm((current) => ({
                            ...current,
                            proposedMonthlyFee: event.target.value,
                          }))
                        }
                        type="number"
                        value={promotionForm.proposedMonthlyFee}
                      />
                    </label>
                    <label>
                      Current phase start date
                      <input
                        className="plain-input"
                        onChange={(event) =>
                          setPromotionForm((current) => ({
                            ...current,
                            currentPhaseStartDate: event.target.value,
                          }))
                        }
                        type="date"
                        value={promotionForm.currentPhaseStartDate}
                      />
                    </label>
                    <label>
                      Months in current phase
                      <input
                        className="plain-input"
                        min="0"
                        onChange={(event) =>
                          setPromotionForm((current) => ({
                            ...current,
                            monthsInCurrentPhase: event.target.value,
                          }))
                        }
                        type="number"
                        value={promotionForm.monthsInCurrentPhase}
                      />
                    </label>
                    <label>
                      Promotion effective date
                      <input
                        className="plain-input"
                        onChange={(event) =>
                          setPromotionForm((current) => ({
                            ...current,
                            promotionEffectiveDate: event.target.value,
                          }))
                        }
                        required
                        type="date"
                        value={promotionForm.promotionEffectiveDate}
                      />
                    </label>
                    <label>
                      Promotion cycle type
                      <input
                        className="plain-input"
                        onChange={(event) =>
                          setPromotionForm((current) => ({
                            ...current,
                            promotionCycleType: event.target.value,
                          }))
                        }
                        required
                        value={promotionForm.promotionCycleType}
                      />
                    </label>
                    <label>
                      Case type
                      <select
                        className="plain-input"
                        onChange={(event) =>
                          setPromotionForm((current) => ({
                            ...current,
                            caseType: event.target.value as PromotionFormState["caseType"],
                          }))
                        }
                        value={promotionForm.caseType}
                      >
                        {promotionCaseTypes.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {selectedPromotionCandidate && (
                    <p className="row-meta">
                      Candidate scope: {selectedPromotionCandidate.programName}
                      {selectedPromotionCandidate.batchName
                        ? ` / ${selectedPromotionCandidate.batchName}`
                        : ""}
                    </p>
                  )}
                  {promotionForm.caseType === "exception_case" && (
                    <label>
                      Exception reason
                      <textarea
                        className="plain-input"
                        onChange={(event) =>
                          setPromotionForm((current) => ({
                            ...current,
                            exceptionReason: event.target.value,
                          }))
                        }
                        rows={3}
                        value={promotionForm.exceptionReason}
                      />
                    </label>
                  )}
                </section>

                <section className="kpi-form-section">
                  <h3>Evidence and Summary</h3>
                  <div className="kpi-summary-grid">
                    <div className="stack-form">
                      <label>
                        Quality or rework summary
                        <textarea
                          className="plain-input"
                          onChange={(event) =>
                            setPromotionForm((current) => ({
                              ...current,
                              qualityReworkSummary: event.target.value,
                            }))
                          }
                          rows={3}
                          value={promotionForm.qualityReworkSummary}
                        />
                      </label>
                      <label>
                        Lead review summary
                        <textarea
                          className="plain-input"
                          onChange={(event) =>
                            setPromotionForm((current) => ({
                              ...current,
                              leadReviewSummary: event.target.value,
                            }))
                          }
                          rows={3}
                          value={promotionForm.leadReviewSummary}
                        />
                      </label>
                      <label>
                        Independent delivery evidence
                        <textarea
                          className="plain-input"
                          onChange={(event) =>
                            setPromotionForm((current) => ({
                              ...current,
                              independentDeliveryEvidence: event.target.value,
                            }))
                          }
                          rows={3}
                          value={promotionForm.independentDeliveryEvidence}
                        />
                      </label>
                      <label>
                        Mentoring or leadership signals
                        <textarea
                          className="plain-input"
                          onChange={(event) =>
                            setPromotionForm((current) => ({
                              ...current,
                              mentoringLeadershipSignals: event.target.value,
                            }))
                          }
                          rows={3}
                          value={promotionForm.mentoringLeadershipSignals}
                        />
                      </label>
                    </div>

                    <div className="stack-form">
                      <p className="row-title small">Key projects completed</p>
                      {promotionForm.keyProjectsCompleted.map((entry, index) => (
                        <input
                          className="plain-input"
                          key={`promotion-project-${index}`}
                          onChange={(event) =>
                            setPromotionListValue("keyProjectsCompleted", index, event.target.value)
                          }
                          placeholder={`Project ${index + 1}`}
                          value={entry}
                        />
                      ))}
                      <p className="row-title small">Skills demonstrated</p>
                      {promotionForm.skillsDemonstrated.map((entry, index) => (
                        <input
                          className="plain-input"
                          key={`promotion-skill-${index}`}
                          onChange={(event) =>
                            setPromotionListValue("skillsDemonstrated", index, event.target.value)
                          }
                          placeholder={`Skill ${index + 1}`}
                          value={entry}
                        />
                      ))}
                      <p className="row-title small">Repository or Git links</p>
                      {promotionForm.repositoryLinks.map((entry, index) => (
                        <input
                          className="plain-input"
                          key={`promotion-link-${index}`}
                          onChange={(event) =>
                            setPromotionListValue("repositoryLinks", index, event.target.value)
                          }
                          placeholder="https://..."
                          value={entry}
                        />
                      ))}
                    </div>
                  </div>
                </section>

                <section className="kpi-form-section">
                  <h3>Eligibility Checklist</h3>
                  <div className="stack-form">
                    {promotionForm.eligibilityChecklist.map((item, index) => (
                      <div className="kpi-form-section" key={item.criterionKey}>
                        <label className="toggle-label">
                          <input
                            checked={item.isMet}
                            onChange={(event) =>
                              updatePromotionChecklistItem(index, "isMet", event.target.checked)
                            }
                            type="checkbox"
                          />
                          <span>{item.criterionLabel}</span>
                        </label>
                        <textarea
                          className="plain-input"
                          onChange={(event) =>
                            updatePromotionChecklistItem(index, "evidence", event.target.value)
                          }
                          placeholder="Evidence for this criterion"
                          rows={2}
                          value={item.evidence ?? ""}
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <section className="kpi-form-section">
                  <h3>Lead Recommendation</h3>
                  <div className="kpi-form-grid">
                    <label>
                      Recommendation
                      <select
                        className="plain-input"
                        onChange={(event) =>
                          setPromotionForm((current) => ({
                            ...current,
                            leadRecommendation: event.target.value as PromotionFormState["leadRecommendation"],
                          }))
                        }
                        value={promotionForm.leadRecommendation}
                      >
                        <option value="hold">Hold</option>
                        <option value="promote">Promote</option>
                        <option value="promote_with_conditions">Promote with conditions</option>
                      </select>
                    </label>
                    <label>
                      Initial assignment in next phase
                      <input
                        className="plain-input"
                        onChange={(event) =>
                          setPromotionForm((current) => ({
                            ...current,
                            initialAssignmentNextPhase: event.target.value,
                          }))
                        }
                        value={promotionForm.initialAssignmentNextPhase}
                      />
                    </label>
                  </div>
                  <label>
                    Recommendation summary
                    <textarea
                      className="plain-input"
                      onChange={(event) =>
                        setPromotionForm((current) => ({
                          ...current,
                          leadRecommendationSummary: event.target.value,
                        }))
                      }
                      rows={3}
                      value={promotionForm.leadRecommendationSummary}
                    />
                  </label>
                  <label>
                    Conditions if applicable
                    <textarea
                      className="plain-input"
                      onChange={(event) =>
                        setPromotionForm((current) => ({
                          ...current,
                          leadRecommendationConditions: event.target.value,
                        }))
                      }
                      rows={3}
                      value={promotionForm.leadRecommendationConditions}
                    />
                  </label>
                </section>

                <button className="command-button primary" disabled={isBusy} type="submit">
                  <Send size={18} aria-hidden="true" />
                  {editingPromotionId ? "Save Promotion Review" : "Create Promotion Review"}
                </button>
              </form>
            </article>
          )}

          <article className="card panel">
            <div className="section-header-row">
              <div>
                <h2>Phase Promotion Reviews</h2>
                <p className="row-meta">
                  Draft {"->"} submitted {"->"} program admin review {"->"} super admin decision.
                </p>
              </div>
            </div>

            {!isCandidate && (
              <form
                className="filter-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  void loadPromotionReviews(promotionFilters).catch((loadError) => {
                    setError(
                      loadError instanceof Error
                        ? loadError.message
                        : "Failed to filter promotion reviews.",
                    );
                  });
                }}
              >
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setPromotionFilters((current) => ({
                      ...current,
                      programId: event.target.value,
                      batchId: "",
                      candidateId: "",
                    }))
                  }
                  value={promotionFilters.programId}
                >
                  <option value="">All programs</option>
                  {candidateOptions.programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setPromotionFilters((current) => ({
                      ...current,
                      batchId: event.target.value,
                      candidateId: "",
                    }))
                  }
                  value={promotionFilters.batchId}
                >
                  <option value="">All batches</option>
                  {availableBatchesForPromotion.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name}
                    </option>
                  ))}
                </select>
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setPromotionFilters((current) => ({
                      ...current,
                      candidateId: event.target.value,
                    }))
                  }
                  value={promotionFilters.candidateId}
                >
                  <option value="">All candidates</option>
                  {availableCandidatesForPromotion.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.label}
                    </option>
                  ))}
                </select>
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setPromotionFilters((current) => ({
                      ...current,
                      caseType: event.target.value,
                    }))
                  }
                  value={promotionFilters.caseType}
                >
                  <option value="">All case types</option>
                  {promotionCaseTypes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  className="plain-input"
                  onChange={(event) =>
                    setPromotionFilters((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  value={promotionFilters.status}
                >
                  <option value="">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under review</option>
                  <option value="revision_required">Revision required</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button className="command-button primary" type="submit">
                  <Filter size={18} aria-hidden="true" />
                  Filter
                </button>
              </form>
            )}

            <div className="daily-log-list">
              {promotionReviews.length === 0 && (
                <p className="row-meta">No phase promotion reviews found.</p>
              )}
              {promotionReviews.map((review) => {
                const programAdminDraft =
                  programAdminDecisionDrafts[review.id] ?? {
                    decision: "recommend_approval" as PhasePromotionProgramAdminDecision,
                    note: "",
                  };
                const superAdminDraft =
                  superAdminDecisionDrafts[review.id] ?? {
                    decision: "approved" as PhasePromotionSuperAdminDecision,
                    note: "",
                  };

                return (
                  <div className="daily-log-row kpi-review-card" key={review.id}>
                    <div className="daily-log-main">
                      <div>
                        <p className="row-title">
                          {review.fullName} / {review.currentPhase} {"->"}{" "}
                          {review.proposedNextPhase}
                        </p>
                        <p className="row-meta">
                          {review.programName}
                          {review.batchName ? ` / ${review.batchName}` : ""}
                        </p>
                        <p className="row-meta">
                          Prepared by {review.preparedByName} on {review.preparedDate}
                        </p>
                      </div>
                      <span
                        className={`status ${
                          review.status === "approved"
                            ? "success"
                            : review.status === "rejected"
                              ? "danger"
                              : ""
                        }`}
                      >
                        {review.status.replaceAll("_", " ")}
                      </span>
                    </div>

                    <div className="kpi-detail-grid">
                      <p className="row-meta">
                        <strong>Designation:</strong> {review.currentDesignation} {"->"}{" "}
                        {review.proposedNextDesignation}
                      </p>
                      <p className="row-meta">
                        <strong>Monthly fee:</strong> {review.currentMonthlyFee ?? "-"} {"->"}{" "}
                        {review.proposedMonthlyFee ?? "-"}
                      </p>
                      <p className="row-meta">
                        <strong>Effective date:</strong> {review.promotionEffectiveDate}
                      </p>
                      <p className="row-meta">
                        <strong>Case type:</strong> {formatPromotionCaseType(review.caseType)}
                      </p>
                      <p className="row-meta">
                        <strong>Cycle type:</strong> {review.promotionCycleType}
                      </p>
                      <p className="row-meta">
                        <strong>Months in phase:</strong> {review.monthsInCurrentPhase ?? "-"}
                      </p>
                    </div>

                    {review.exceptionReason && (
                      <p className="row-meta">
                        <strong>Exception reason:</strong> {review.exceptionReason}
                      </p>
                    )}

                    <div className="kpi-detail-grid">
                      <p className="row-meta">
                        <strong>Recent KPI average:</strong>{" "}
                        {review.evidence.overallRecentAverage ?? "-"}
                      </p>
                      <p className="row-meta">
                        <strong>Hours compliance:</strong>{" "}
                        {review.evidence.hoursComplianceSummary ?? "-"}
                      </p>
                      <p className="row-meta">
                        <strong>Task summary:</strong>{" "}
                        {review.evidence.taskCompletionSummary ?? "-"}
                      </p>
                      {review.evidence.relatedQuarterlySummary && (
                        <p className="row-meta">
                          <strong>Related quarterly summary:</strong> Q
                          {review.evidence.relatedQuarterlySummary.reviewQuarter}{" "}
                          {review.evidence.relatedQuarterlySummary.reviewYear}
                          {review.evidence.relatedQuarterlySummary.quarterlyAverageScore !== null
                            ? ` (${review.evidence.relatedQuarterlySummary.quarterlyAverageScore}/100)`
                            : ""}
                        </p>
                      )}
                    </div>

                    {review.evidence.recentMonthlyKpiAverages.length > 0 && (
                      <div className="submitted-log-table-wrap">
                        <table className="submitted-log-table">
                          <thead>
                            <tr>
                              <th>Monthly KPI</th>
                              <th>Average</th>
                            </tr>
                          </thead>
                          <tbody>
                            {review.evidence.recentMonthlyKpiAverages.map((item) => (
                              <tr key={`${review.id}-${item.reviewPeriod}`}>
                                <td>{item.reviewPeriod}</td>
                                <td>{item.overallScore}/100</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {review.evidence.hoursComplianceTrend.length > 0 && (
                      <div className="submitted-log-table-wrap">
                        <table className="submitted-log-table">
                          <thead>
                            <tr>
                              <th>Period</th>
                              <th>Actual / Target Hours</th>
                              <th>Compliance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {review.evidence.hoursComplianceTrend.map((item) => (
                              <tr key={`${review.id}-hours-${item.reviewPeriod}`}>
                                <td>{item.reviewPeriod}</td>
                                <td>
                                  {item.actualHoursLogged}/{item.monthlyTargetHours}
                                </td>
                                <td>{item.complianceStatus.replaceAll("_", " ")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {review.evidence.taskApprovalTrend.length > 0 && (
                      <div className="submitted-log-table-wrap">
                        <table className="submitted-log-table">
                          <thead>
                            <tr>
                              <th>Period</th>
                              <th>Approved</th>
                              <th>Revisions</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {review.evidence.taskApprovalTrend.map((item) => (
                              <tr key={`${review.id}-tasks-${item.reviewPeriod}`}>
                                <td>{item.reviewPeriod}</td>
                                <td>{item.approvedCount}</td>
                                <td>{item.revisionCount}</td>
                                <td>{item.totalCount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {review.linkedEvidence && (
                      <LinkedEvidencePanel linkedEvidence={review.linkedEvidence} />
                    )}

                    <div className="kpi-summary-grid compact">
                      <div>
                        <p className="row-title small">Checklist</p>
                        <ul className="kpi-tag-list">
                          {review.eligibilityChecklist.map((item) => (
                            <li key={`${review.id}-${item.criterionKey}`}>
                              {item.isMet ? "Yes" : "No"} - {item.criterionLabel}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="row-title small">Lead Recommendation</p>
                        <p className="row-meta">
                          <strong>Recommendation:</strong>{" "}
                          {review.leadRecommendation.recommendation.replaceAll("_", " ")}
                        </p>
                        {review.leadRecommendation.summary && (
                          <p className="row-meta">{review.leadRecommendation.summary}</p>
                        )}
                        {review.leadRecommendation.conditions && (
                          <p className="row-meta">
                            <strong>Conditions:</strong> {review.leadRecommendation.conditions}
                          </p>
                        )}
                        {review.leadRecommendation.initialAssignmentNextPhase && (
                          <p className="row-meta">
                            <strong>Initial assignment:</strong>{" "}
                            {review.leadRecommendation.initialAssignmentNextPhase}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="stack-form">
                      {review.evidence.qualityReworkSummary && (
                        <p className="row-meta">
                          <strong>Quality or rework:</strong>{" "}
                          {review.evidence.qualityReworkSummary}
                        </p>
                      )}
                      {review.evidence.leadReviewSummary && (
                        <p className="row-meta">
                          <strong>Lead review summary:</strong>{" "}
                          {review.evidence.leadReviewSummary}
                        </p>
                      )}
                      {review.evidence.independentDeliveryEvidence && (
                        <p className="row-meta">
                          <strong>Independent delivery:</strong>{" "}
                          {review.evidence.independentDeliveryEvidence}
                        </p>
                      )}
                      {review.evidence.mentoringLeadershipSignals && (
                        <p className="row-meta">
                          <strong>Leadership signals:</strong>{" "}
                          {review.evidence.mentoringLeadershipSignals}
                        </p>
                      )}
                    </div>

                    {(review.evidence.keyProjectsCompleted.length > 0 ||
                      review.evidence.skillsDemonstrated.length > 0 ||
                      review.evidence.repositoryLinks.length > 0) && (
                      <div className="kpi-summary-grid compact">
                        <div>
                          <p className="row-title small">Key projects</p>
                          <ul className="kpi-tag-list">
                            {review.evidence.keyProjectsCompleted.map((item, index) => (
                              <li key={`promotion-project-${review.id}-${index}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="row-title small">Skills demonstrated</p>
                          <ul className="kpi-tag-list">
                            {review.evidence.skillsDemonstrated.map((item, index) => (
                              <li key={`promotion-skill-${review.id}-${index}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {review.status === "draft" || review.status === "revision_required" ? (
                      canManage && (
                        <div className="review-controls">
                          <button
                            className="command-button"
                            disabled={isBusy}
                            onClick={() => handleEditPromotionDraft(review)}
                            type="button"
                          >
                            <Pencil size={18} aria-hidden="true" />
                            Edit Draft
                          </button>
                          <button
                            className="command-button primary"
                            disabled={isBusy}
                            onClick={() => void handleSubmitPromotionForReview(review)}
                            type="button"
                          >
                            <Send size={18} aria-hidden="true" />
                            Submit for Review
                          </button>
                        </div>
                      )
                    ) : null}

                    {canProgramAdminReview &&
                      ["submitted", "under_review"].includes(review.status) &&
                      review.status !== "approved" &&
                      review.status !== "rejected" && (
                        <div className="stack-form">
                          <p className="row-title small">Program Admin Review</p>
                          <div className="kpi-form-grid">
                            <label>
                              Decision
                              <select
                                className="plain-input"
                                onChange={(event) =>
                                  setProgramAdminDecisionDrafts((current) => ({
                                    ...current,
                                    [review.id]: {
                                      ...programAdminDraft,
                                      decision:
                                        event.target.value as PhasePromotionProgramAdminDecision,
                                    },
                                  }))
                                }
                                value={programAdminDraft.decision}
                              >
                                {promotionProgramAdminDecisions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="kpi-form-wide">
                              Note
                              <textarea
                                className="plain-input"
                                onChange={(event) =>
                                  setProgramAdminDecisionDrafts((current) => ({
                                    ...current,
                                    [review.id]: {
                                      ...programAdminDraft,
                                      note: event.target.value,
                                    },
                                  }))
                                }
                                rows={3}
                                value={programAdminDraft.note}
                              />
                            </label>
                          </div>
                          <button
                            className="command-button"
                            disabled={isBusy}
                            onClick={() => void handleProgramAdminPromotionReview(review)}
                            type="button"
                          >
                            <CheckCircle2 size={18} aria-hidden="true" />
                            Save Program Admin Review
                          </button>
                        </div>
                      )}

                    {review.programAdminReview.decision && (
                      <p className="row-meta">
                        <strong>Program Admin review:</strong>{" "}
                        {review.programAdminReview.decision.replaceAll("_", " ")}
                        {review.programAdminReview.note
                          ? ` - ${review.programAdminReview.note}`
                          : ""}
                      </p>
                    )}

                    {canSuperAdminDecide &&
                      ["submitted", "under_review"].includes(review.status) && (
                        <div className="stack-form">
                          <p className="row-title small">Super Admin Final Decision</p>
                          <div className="kpi-form-grid">
                            <label>
                              Decision
                              <select
                                className="plain-input"
                                onChange={(event) =>
                                  setSuperAdminDecisionDrafts((current) => ({
                                    ...current,
                                    [review.id]: {
                                      ...superAdminDraft,
                                      decision:
                                        event.target.value as PhasePromotionSuperAdminDecision,
                                    },
                                  }))
                                }
                                value={superAdminDraft.decision}
                              >
                                {promotionSuperAdminDecisions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="kpi-form-wide">
                              Note
                              <textarea
                                className="plain-input"
                                onChange={(event) =>
                                  setSuperAdminDecisionDrafts((current) => ({
                                    ...current,
                                    [review.id]: {
                                      ...superAdminDraft,
                                      note: event.target.value,
                                    },
                                  }))
                                }
                                rows={3}
                                value={superAdminDraft.note}
                              />
                            </label>
                          </div>
                          <button
                            className="command-button primary"
                            disabled={isBusy}
                            onClick={() => void handleSuperAdminPromotionDecision(review)}
                            type="button"
                          >
                            <CheckCircle2 size={18} aria-hidden="true" />
                            Record Final Decision
                          </button>
                        </div>
                      )}

                    {review.superAdminDecision.decision && (
                      <p className="row-meta">
                        <strong>Final decision:</strong>{" "}
                        {review.superAdminDecision.decision.replaceAll("_", " ")}
                        {review.superAdminDecision.note
                          ? ` - ${review.superAdminDecision.note}`
                          : ""}
                      </p>
                    )}

                    {isCandidate &&
                      ["approved", "rejected"].includes(review.status) &&
                      !review.candidateAcknowledgedAt && (
                        <button
                          className="command-button primary"
                          disabled={isBusy}
                          onClick={() => void handleAcknowledgePromotionReview(review)}
                          type="button"
                        >
                          <CheckCircle2 size={18} aria-hidden="true" />
                          Acknowledge Decision
                        </button>
                      )}

                    {review.candidateAcknowledgedAt && (
                      <p className="row-meta">
                        <strong>Candidate acknowledged:</strong>{" "}
                        {new Date(review.candidateAcknowledgedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </article>
        </section>
      )}
    </AppShell>
  );
}
