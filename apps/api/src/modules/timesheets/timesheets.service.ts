import type { Role } from "@lms/shared";

import {
  notifyTimesheetRevisionRequired,
  notifyTimesheetReviewed,
  notifyTimesheetSubmitted,
} from "../../integrations/notifications/workflow-notifications.js";
import { HttpError } from "../../errors/http-error.js";
import type {
  CreateTimesheetInput,
  ListTimesheetsInput,
  ReviewTimesheetInput,
  TimesheetEntryInput,
  UpdateTimesheetInput,
} from "./timesheets.schema.js";
import { TimesheetsRepository, type TimesheetRecord } from "./timesheets.repository.js";

type ActorContext = {
  actorId: string;
  role: Role;
  ipAddress?: string;
  userAgent?: string;
};

const toTimesheetResponse = (timesheet: TimesheetRecord) => ({
  id: timesheet.id,
  candidateId: timesheet.candidateId,
  userId: timesheet.userId,
  fullName: timesheet.fullName,
  email: timesheet.email,
  candidateCode: timesheet.candidateCode,
  programId: timesheet.programId,
  programName: timesheet.programName,
  batchId: timesheet.batchId,
  batchName: timesheet.batchName,
  weekStartDate: timesheet.weekStartDate,
  weekEndDate: timesheet.weekEndDate,
  totalMinutes: timesheet.totalMinutes,
  entries: timesheet.entries,
  status: timesheet.status,
  submittedAt: timesheet.submittedAt.toISOString(),
  reviewedAt: timesheet.reviewedAt?.toISOString() ?? null,
  reviewedBy: timesheet.reviewedBy,
  reviewNote: timesheet.reviewNote,
  isActive: timesheet.isActive,
  createdAt: timesheet.createdAt.toISOString(),
  updatedAt: timesheet.updatedAt.toISOString(),
  deletedAt: timesheet.deletedAt?.toISOString() ?? null,
});

const prepareEntries = (entries: TimesheetEntryInput[]) =>
  entries.map((entry) => ({
    ...entry,
    hours: Number(entry.hours.toFixed(2)),
    minutes: Math.round(entry.hours * 60),
    summary: entry.summary || undefined,
    blockers: entry.blockers || undefined,
  }));

const validateEntries = (entries: ReturnType<typeof prepareEntries>) => {
  const totalMinutes = entries.reduce((total, entry) => total + entry.minutes, 0);

  if (totalMinutes <= 0) {
    throw new HttpError(
      400,
      "timesheet_hours_required",
      "At least one day must have submitted hours.",
    );
  }

  const missingSummary = entries.find((entry) => entry.minutes > 0 && !entry.summary);

  if (missingSummary) {
    throw new HttpError(
      400,
      "timesheet_summary_required",
      "Each day with hours must include a summary.",
    );
  }

  return totalMinutes;
};

export class TimesheetsService {
  constructor(private readonly repository = new TimesheetsRepository()) {}

  async listTimesheets(input: ListTimesheetsInput, context: ActorContext) {
    const timesheets = await this.repository.list({
      ...input,
      actorId: context.actorId,
      role: context.role,
    });

    return timesheets.map(toTimesheetResponse);
  }

  async createTimesheet(input: CreateTimesheetInput, context: ActorContext) {
    if (context.role !== "Candidate") {
      throw new HttpError(403, "timesheet_submitter_required", "Only candidates can submit timesheets.");
    }

    const ownCandidate = await this.repository.findCandidateByUserId(context.actorId);

    if (!ownCandidate || ownCandidate.deletedAt || ownCandidate.status !== "active") {
      throw new HttpError(404, "candidate_not_found", "Active candidate not found.");
    }

    if (input.candidateId && input.candidateId !== ownCandidate.id) {
      throw new HttpError(
        403,
        "candidate_scope_denied",
        "Candidates can submit timesheets only for themselves.",
      );
    }

    const existingTimesheet = await this.repository.findByCandidateAndWeek(
      ownCandidate.id,
      input.weekStartDate,
    );

    if (existingTimesheet) {
      throw new HttpError(
        409,
        "timesheet_exists",
        "A timesheet already exists for this candidate and week.",
      );
    }

    const entries = prepareEntries(input.entries);
    const totalMinutes = validateEntries(entries);

    const timesheet = await this.repository.create({
      candidateId: ownCandidate.id,
      weekStartDate: input.weekStartDate,
      weekEndDate: input.weekEndDate,
      totalMinutes,
      entries,
      actorId: context.actorId,
    });

    if (!timesheet) {
      throw new HttpError(500, "timesheet_create_failed", "Failed to submit timesheet.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "timesheet.submitted",
      entityType: "timesheet",
      entityId: timesheet.id,
      newValue: toTimesheetResponse(timesheet),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "timesheet.submitted",
      entityType: "timesheet",
      entityId: timesheet.id,
      actorType: "user",
      actorId: context.actorId,
      payload: toTimesheetResponse(timesheet),
    });
    await notifyTimesheetSubmitted({
      candidateId: timesheet.candidateId,
      fullName: timesheet.fullName,
      weekStartDate: timesheet.weekStartDate,
    });

    return toTimesheetResponse(timesheet);
  }

  async updateTimesheet(id: string, input: UpdateTimesheetInput, context: ActorContext) {
    if (context.role !== "Candidate") {
      throw new HttpError(403, "timesheet_submitter_required", "Only candidates can revise timesheets.");
    }

    const existingTimesheet = await this.repository.findById(id);

    if (!existingTimesheet || existingTimesheet.userId !== context.actorId) {
      throw new HttpError(404, "timesheet_not_found", "Timesheet not found.");
    }

    if (existingTimesheet.status !== "revision_required") {
      throw new HttpError(
        409,
        "timesheet_revision_not_allowed",
        "Only timesheets marked revision required can be edited by the candidate.",
      );
    }

    const entries = prepareEntries(input.entries);
    const totalMinutes = validateEntries(entries);
    const updatedTimesheet = await this.repository.resubmit(id, {
      totalMinutes,
      entries,
      actorId: context.actorId,
    });

    if (!updatedTimesheet) {
      throw new HttpError(404, "timesheet_not_found", "Timesheet not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "timesheet.resubmitted",
      entityType: "timesheet",
      entityId: id,
      oldValue: toTimesheetResponse(existingTimesheet),
      newValue: toTimesheetResponse(updatedTimesheet),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "timesheet.resubmitted",
      entityType: "timesheet",
      entityId: id,
      actorType: "user",
      actorId: context.actorId,
      payload: toTimesheetResponse(updatedTimesheet),
    });

    return toTimesheetResponse(updatedTimesheet);
  }

  async reviewTimesheet(id: string, input: ReviewTimesheetInput, context: ActorContext) {
    if (!["Super Admin", "Program Admin", "Program Lead"].includes(context.role)) {
      throw new HttpError(
        403,
        "timesheet_reviewer_required",
        "Only admins and leads can review timesheets.",
      );
    }

    const canAccess = await this.repository.canAccessTimesheet({
      timesheetId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(404, "timesheet_not_found", "Timesheet not found.");
    }

    const existingTimesheet = await this.repository.findById(id);
    const reviewedTimesheet = await this.repository.review(id, {
      ...input,
      actorId: context.actorId,
    });

    if (!existingTimesheet || !reviewedTimesheet) {
      throw new HttpError(404, "timesheet_not_found", "Timesheet not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: `timesheet.${input.status}`,
      entityType: "timesheet",
      entityId: id,
      oldValue: toTimesheetResponse(existingTimesheet),
      newValue: toTimesheetResponse(reviewedTimesheet),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: `timesheet.${input.status}`,
      entityType: "timesheet",
      entityId: id,
      actorType: "user",
      actorId: context.actorId,
      payload: toTimesheetResponse(reviewedTimesheet),
    });

    if (input.status === "revision_required") {
      await notifyTimesheetRevisionRequired({
        candidateUserId: reviewedTimesheet.userId,
        weekStartDate: reviewedTimesheet.weekStartDate,
        reviewNote: input.reviewNote,
      });
    } else if (input.status === "approved" || input.status === "rejected") {
      await notifyTimesheetReviewed({
        candidateUserId: reviewedTimesheet.userId,
        weekStartDate: reviewedTimesheet.weekStartDate,
        status: input.status,
      });
    }

    return toTimesheetResponse(reviewedTimesheet);
  }
}
