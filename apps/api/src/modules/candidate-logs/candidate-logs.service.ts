import type { Role } from "@lms/shared";

import { HttpError } from "../../errors/http-error.js";
import type {
  CandidateLogEntryInput,
  CreateCandidateLogInput,
  ListCandidateLogsInput,
  ReviewCandidateLogInput,
} from "./candidate-logs.schema.js";
import {
  CandidateLogsRepository,
  type CandidateLogRecord,
} from "./candidate-logs.repository.js";

type ActorContext = {
  actorId: string;
  role: Role;
  ipAddress?: string;
  userAgent?: string;
};

const toCandidateLogResponse = (log: CandidateLogRecord) => ({
  id: log.id,
  candidateId: log.candidateId,
  userId: log.userId,
  fullName: log.fullName,
  email: log.email,
  candidateCode: log.candidateCode,
  programId: log.programId,
  programName: log.programName,
  batchId: log.batchId,
  batchName: log.batchName,
  logDate: log.logDate,
  minutesSpent: log.minutesSpent,
  entries: log.entries,
  summary: log.summary,
  blockers: log.blockers,
  status: log.status,
  submittedAt: log.submittedAt.toISOString(),
  reviewedAt: log.reviewedAt?.toISOString() ?? null,
  reviewedBy: log.reviewedBy,
  reviewNote: log.reviewNote,
  isActive: log.isActive,
  createdAt: log.createdAt.toISOString(),
  updatedAt: log.updatedAt.toISOString(),
  deletedAt: log.deletedAt?.toISOString() ?? null,
});

const minutesFromTimeRange = (startTime: string, endTime: string) => {
  const [startHour = 0, startMinute = 0] = startTime.split(":").map(Number);
  const [endHour = 0, endMinute = 0] = endTime.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;

  return end > start ? end - start : 0;
};

const prepareEntries = (entries: CandidateLogEntryInput[]) =>
  entries.map((entry) => {
    const minutes = minutesFromTimeRange(entry.startTime, entry.endTime);

    return {
      ...entry,
      hours: Number((minutes / 60).toFixed(2)),
    };
  });

const buildSummary = (entries: ReturnType<typeof prepareEntries>) =>
  entries
    .map((entry) => `${entry.taskReference}: ${entry.taskDescription}`)
    .join("\n");

const buildBlockers = (entries: ReturnType<typeof prepareEntries>) => {
  const blockers = entries
    .map((entry) => entry.notesBlocker)
    .filter((blocker): blocker is string => Boolean(blocker));

  return blockers.length > 0 ? blockers.join("\n") : undefined;
};

export class CandidateLogsService {
  constructor(private readonly repository = new CandidateLogsRepository()) {}

  async listLogs(input: ListCandidateLogsInput, context: ActorContext) {
    const logs = await this.repository.list({
      ...input,
      actorId: context.actorId,
      role: context.role,
    });

    return logs.map(toCandidateLogResponse);
  }

  async createLog(input: CreateCandidateLogInput, context: ActorContext) {
    if (context.role !== "Candidate") {
      throw new HttpError(
        403,
        "candidate_log_submitter_required",
        "Only candidates can submit daily logs.",
      );
    }

    const ownCandidate = await this.repository.findCandidateByUserId(context.actorId);

    if (!ownCandidate || ownCandidate.deletedAt || ownCandidate.status !== "active") {
      throw new HttpError(404, "candidate_not_found", "Active candidate not found.");
    }

    if (input.candidateId && input.candidateId !== ownCandidate.id) {
      throw new HttpError(
        403,
        "candidate_scope_denied",
        "Candidates can submit logs only for themselves.",
      );
    }

    const existingLog = await this.repository.findByCandidateAndDate(
      ownCandidate.id,
      input.logDate,
    );

    if (existingLog) {
      throw new HttpError(
        409,
        "candidate_log_exists",
        "A daily log already exists for this date.",
      );
    }

    const entries = prepareEntries(input.entries);
    const minutesSpent = entries.reduce(
      (total, entry) => total + Math.round(entry.hours * 60),
      0,
    );

    if (minutesSpent <= 0) {
      throw new HttpError(
        400,
        "candidate_log_hours_required",
        "At least one row must have an end time after its start time.",
      );
    }

    const log = await this.repository.create({
      candidateId: ownCandidate.id,
      logDate: input.logDate,
      minutesSpent,
      entries,
      summary: buildSummary(entries),
      blockers: buildBlockers(entries),
      actorId: context.actorId,
    });

    if (!log) {
      throw new HttpError(500, "candidate_log_create_failed", "Failed to submit daily log.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "candidate.log.submitted",
      entityType: "candidate_log",
      entityId: log.id,
      newValue: toCandidateLogResponse(log),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "candidate.log.submitted",
      entityType: "candidate_log",
      entityId: log.id,
      actorType: "user",
      actorId: context.actorId,
      payload: toCandidateLogResponse(log),
    });

    return toCandidateLogResponse(log);
  }

  async reviewLog(id: string, input: ReviewCandidateLogInput, context: ActorContext) {
    if (!["Super Admin", "Program Admin", "Program Lead"].includes(context.role)) {
      throw new HttpError(
        403,
        "candidate_log_reviewer_required",
        "Only admins and leads can review daily logs.",
      );
    }

    const canAccess = await this.repository.canAccessLog({
      logId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(404, "candidate_log_not_found", "Daily log not found.");
    }

    const existingLog = await this.repository.findById(id);
    const reviewedLog = await this.repository.review(id, {
      ...input,
      actorId: context.actorId,
    });

    if (!existingLog || !reviewedLog) {
      throw new HttpError(404, "candidate_log_not_found", "Daily log not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: `candidate.log.${input.status}`,
      entityType: "candidate_log",
      entityId: id,
      oldValue: toCandidateLogResponse(existingLog),
      newValue: toCandidateLogResponse(reviewedLog),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: `candidate.log.${input.status}`,
      entityType: "candidate_log",
      entityId: id,
      actorType: "user",
      actorId: context.actorId,
      payload: toCandidateLogResponse(reviewedLog),
    });

    return toCandidateLogResponse(reviewedLog);
  }
}
