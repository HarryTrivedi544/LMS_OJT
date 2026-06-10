import { candidateLogs, candidates, db, timesheets, users } from "@lms/db";
import { and, eq, isNull } from "drizzle-orm";

import { processWorkflowNotification } from "./process-workflow-notification.js";

const todayDateString = () => new Date().toISOString().slice(0, 10);

const currentWeekStartDate = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);

  return date.toISOString().slice(0, 10);
};

export const processDailyLogReminder = async () => {
  const today = todayDateString();
  const activeCandidates = await db
    .select({
      userId: candidates.userId,
      fullName: users.fullName,
    })
    .from(candidates)
    .innerJoin(users, eq(users.id, candidates.userId))
    .where(
      and(
        isNull(candidates.deletedAt),
        eq(candidates.status, "active"),
        eq(users.status, "active"),
        isNull(users.deletedAt),
      ),
    );

  for (const candidate of activeCandidates) {
    const [existingLog] = await db
      .select({ id: candidateLogs.id })
      .from(candidateLogs)
      .innerJoin(candidates, eq(candidates.id, candidateLogs.candidateId))
      .where(
        and(
          eq(candidates.userId, candidate.userId),
          eq(candidateLogs.logDate, today),
          isNull(candidateLogs.deletedAt),
        ),
      )
      .limit(1);

    if (existingLog) {
      continue;
    }

    await processWorkflowNotification({
      type: "workflow",
      userId: candidate.userId,
      triggerName: "daily_log_reminder",
      title: "Daily log reminder",
      body: `Hi ${candidate.fullName}, please submit your daily log for ${today}.`,
      metadata: { logDate: today },
    });
  }
};

export const processWeeklyTimesheetReminder = async () => {
  const weekStartDate = currentWeekStartDate();
  const activeCandidates = await db
    .select({
      userId: candidates.userId,
      fullName: users.fullName,
    })
    .from(candidates)
    .innerJoin(users, eq(users.id, candidates.userId))
    .where(
      and(
        isNull(candidates.deletedAt),
        eq(candidates.status, "active"),
        eq(users.status, "active"),
        isNull(users.deletedAt),
      ),
    );

  for (const candidate of activeCandidates) {
    const [existingTimesheet] = await db
      .select({ id: timesheets.id })
      .from(timesheets)
      .innerJoin(candidates, eq(candidates.id, timesheets.candidateId))
      .where(
        and(
          eq(candidates.userId, candidate.userId),
          eq(timesheets.weekStartDate, weekStartDate),
          isNull(timesheets.deletedAt),
        ),
      )
      .limit(1);

    if (existingTimesheet) {
      continue;
    }

    await processWorkflowNotification({
      type: "workflow",
      userId: candidate.userId,
      triggerName: "weekly_timesheet_reminder",
      title: "Weekly timesheet reminder",
      body: `Hi ${candidate.fullName}, please submit your timesheet for week starting ${weekStartDate}.`,
      metadata: { weekStartDate },
    });
  }
};
