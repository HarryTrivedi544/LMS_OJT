import {
  dispatchWorkflowNotifications,
} from "./notification-dispatcher.js";
import {
  getCandidateUserId,
  getProgramAdminUserIdsForCandidate,
  getReviewerUserIdsForCandidate,
  getSuperAdminUserIds,
} from "./notification-recipients.js";

export const notifyTimesheetSubmitted = async (input: {
  candidateId: string;
  fullName: string;
  weekStartDate: string;
}) => {
  const reviewerIds = await getReviewerUserIdsForCandidate(input.candidateId);

  await dispatchWorkflowNotifications(
    reviewerIds.map((userId) => ({
      userId,
      triggerName: "timesheet.submitted",
      title: "Timesheet submitted for review",
      body: `${input.fullName} submitted a timesheet for week starting ${input.weekStartDate}.`,
      metadata: input,
    })),
  );
};

export const notifyTimesheetRevisionRequired = async (input: {
  candidateUserId: string;
  weekStartDate: string;
  reviewNote?: string | null;
}) => {
  await dispatchWorkflowNotifications([
    {
      userId: input.candidateUserId,
      triggerName: "timesheet.revision_required",
      title: "Timesheet needs revision",
      body: input.reviewNote
        ? `Your timesheet for week ${input.weekStartDate} needs revision: ${input.reviewNote}`
        : `Your timesheet for week ${input.weekStartDate} needs revision.`,
      metadata: input,
    },
  ]);
};

export const notifyTimesheetReviewed = async (input: {
  candidateUserId: string;
  weekStartDate: string;
  status: string;
}) => {
  await dispatchWorkflowNotifications([
    {
      userId: input.candidateUserId,
      triggerName: `timesheet.${input.status}`,
      title: `Timesheet ${input.status.replaceAll("_", " ")}`,
      body: `Your timesheet for week ${input.weekStartDate} is now ${input.status.replaceAll("_", " ")}.`,
      metadata: input,
    },
  ]);
};

export const notifyDailyLogSubmitted = async (input: {
  candidateId: string;
  fullName: string;
  logDate: string;
}) => {
  const reviewerIds = await getReviewerUserIdsForCandidate(input.candidateId);

  await dispatchWorkflowNotifications(
    reviewerIds.map((userId) => ({
      userId,
      triggerName: "candidate.log.submitted",
      title: "Daily log submitted",
      body: `${input.fullName} submitted a daily log for ${input.logDate}.`,
      metadata: input,
    })),
  );
};

export const notifyTaskAssigned = async (input: {
  candidateId: string;
  title: string;
  dueDate?: string | null;
}) => {
  const candidateUserId = await getCandidateUserId(input.candidateId);

  if (!candidateUserId) {
    return;
  }

  await dispatchWorkflowNotifications([
    {
      userId: candidateUserId,
      triggerName: "task.assigned",
      title: "New task assigned",
      body: input.dueDate
        ? `You have a new task "${input.title}" due on ${input.dueDate}.`
        : `You have a new task "${input.title}".`,
      metadata: input,
    },
  ]);
};

export const notifyTaskSubmitted = async (input: {
  candidateId: string;
  fullName: string;
  title: string;
}) => {
  const reviewerIds = await getReviewerUserIdsForCandidate(input.candidateId);

  await dispatchWorkflowNotifications(
    reviewerIds.map((userId) => ({
      userId,
      triggerName: "task.submitted",
      title: "Task submission received",
      body: `${input.fullName} submitted task "${input.title}" for review.`,
      metadata: input,
    })),
  );
};

export const notifyTaskRevisionRequired = async (input: {
  candidateUserId: string;
  title: string;
  reviewNote?: string | null;
}) => {
  await dispatchWorkflowNotifications([
    {
      userId: input.candidateUserId,
      triggerName: "task.revision_required",
      title: "Task needs revision",
      body: input.reviewNote
        ? `Task "${input.title}" needs revision: ${input.reviewNote}`
        : `Task "${input.title}" needs revision.`,
      metadata: input,
    },
  ]);
};

export const notifyKpiReviewCompleted = async (input: {
  candidateUserId: string;
  reviewPeriod: string;
  overallScore: number | null;
}) => {
  await dispatchWorkflowNotifications([
    {
      userId: input.candidateUserId,
      triggerName: "kpi.review.completed",
      title: "KPI review completed",
      body:
        input.overallScore !== null
          ? `Your KPI review for ${input.reviewPeriod} is available. Overall score: ${input.overallScore}%.`
          : `Your KPI review for ${input.reviewPeriod} is available.`,
      metadata: input,
    },
  ]);
};

export const notifyQuarterlyKpiSummaryCompleted = async (input: {
  candidateUserId: string;
  reviewYear: number;
  reviewQuarter: number;
  quarterlyAverageScore: number | null;
}) => {
  await dispatchWorkflowNotifications([
    {
      userId: input.candidateUserId,
      triggerName: "quarterly.kpi.completed",
      title: "Quarterly KPI summary completed",
      body:
        input.quarterlyAverageScore !== null
          ? `Your quarterly KPI summary for Q${input.reviewQuarter} ${input.reviewYear} is available. Quarterly average: ${input.quarterlyAverageScore}%.`
          : `Your quarterly KPI summary for Q${input.reviewQuarter} ${input.reviewYear} is available.`,
      metadata: input,
    },
  ]);
};

export const notifyPhasePromotionSubmitted = async (input: {
  candidateId: string;
  fullName: string;
  proposedNextPhase: string;
  preparedByName: string;
  submittedByUserId?: string;
}) => {
  const programAdminIds = await getProgramAdminUserIdsForCandidate(input.candidateId);
  const recipientIds = programAdminIds.filter((userId) => userId !== input.submittedByUserId);

  await dispatchWorkflowNotifications(
    recipientIds.map((userId) => ({
      userId,
      triggerName: "phase.promotion.submitted",
      title: "Phase promotion review submitted",
      body: `${input.preparedByName} submitted a phase promotion review for ${input.fullName} to move to ${input.proposedNextPhase}.`,
      metadata: input,
    })),
  );
};

export const notifyPhasePromotionProgramAdminReviewed = async (input: {
  candidateId: string;
  fullName: string;
  decision: "recommend_approval" | "recommend_rejection" | "revision_required";
  note: string;
  proposedNextPhase: string;
  preparedByUserId: string;
  reviewedByUserId?: string;
}) => {
  if (input.decision === "revision_required") {
    await dispatchWorkflowNotifications([
      {
        userId: input.preparedByUserId,
        triggerName: "phase.promotion.revision_required",
        title: "Phase promotion review needs revision",
        body: `The phase promotion review for ${input.fullName} needs revision${input.note ? `: ${input.note}` : "."}`,
        metadata: input,
      },
    ]);
    return;
  }

  const superAdminIds = await getSuperAdminUserIds();
  const recipientIds = superAdminIds.filter((userId) => userId !== input.reviewedByUserId);
  const readableDecision =
    input.decision === "recommend_approval" ? "recommended for approval" : "recommended for rejection";

  await dispatchWorkflowNotifications(
    recipientIds.map((userId) => ({
      userId,
      triggerName: "phase.promotion.program_admin_reviewed",
      title: "Phase promotion review ready for final decision",
      body: `${input.fullName} has been ${readableDecision} for ${input.proposedNextPhase}${input.note ? `: ${input.note}` : "."}`,
      metadata: input,
    })),
  );
};

export const notifyPhasePromotionFinalDecision = async (input: {
  candidateUserId: string;
  fullName: string;
  decision: "approved" | "rejected" | "revision_required";
  proposedNextPhase: string;
  note: string;
  preparedByUserId: string;
  decidedByUserId?: string;
}) => {
  const notifications = [
    {
      userId: input.candidateUserId,
      triggerName: `phase.promotion.${input.decision}`,
      title: `Phase promotion ${input.decision.replaceAll("_", " ")}`,
      body:
        input.decision === "approved"
          ? `Your phase promotion decision is approved for ${input.proposedNextPhase}.${input.note ? ` ${input.note}` : ""}`
          : input.decision === "rejected"
            ? `Your phase promotion request was rejected.${input.note ? ` ${input.note}` : ""}`
            : `Your phase promotion review needs revision.${input.note ? ` ${input.note}` : ""}`,
      metadata: input,
    },
  ];

  if (input.preparedByUserId !== input.candidateUserId && input.preparedByUserId !== input.decidedByUserId) {
    notifications.push({
      userId: input.preparedByUserId,
      triggerName: `phase.promotion.${input.decision}`,
      title: `Phase promotion ${input.decision.replaceAll("_", " ")}`,
      body: `Final decision recorded for ${input.fullName}: ${input.decision.replaceAll("_", " ")}.${input.note ? ` ${input.note}` : ""}`,
      metadata: input,
    });
  }

  await dispatchWorkflowNotifications(notifications);
};

export const notifyPhasePromotionAcknowledged = async (input: {
  fullName: string;
  acknowledgedAt: string;
  stakeholderUserIds: string[];
  acknowledgedByUserId?: string;
}) => {
  const recipientIds = [...new Set(input.stakeholderUserIds)].filter(
    (userId) => userId && userId !== input.acknowledgedByUserId,
  );

  await dispatchWorkflowNotifications(
    recipientIds.map((userId) => ({
      userId,
      triggerName: "phase.promotion.acknowledged",
      title: "Phase promotion decision acknowledged",
      body: `${input.fullName} acknowledged the final phase promotion decision on ${input.acknowledgedAt}.`,
      metadata: input,
    })),
  );
};
