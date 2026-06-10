import {
  dispatchWorkflowNotifications,
} from "./notification-dispatcher.js";
import {
  getCandidateUserId,
  getReviewerUserIdsForCandidate,
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
