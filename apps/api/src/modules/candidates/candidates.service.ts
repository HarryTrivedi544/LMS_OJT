import type { Role } from "@lms/shared";

import { HttpError } from "../../errors/http-error.js";
import { hashPassword } from "../../security/password.js";
import type {
  CreateCandidateInput,
  ListCandidatesInput,
} from "./candidates.schema.js";
import {
  CandidatesRepository,
  type CandidateOptionRecord,
  type CandidateRecord,
} from "./candidates.repository.js";

type ActorContext = {
  actorId: string;
  role: Role;
  ipAddress?: string;
  userAgent?: string;
};

const toCandidateResponse = (candidate: CandidateRecord) => ({
  id: candidate.id,
  userId: candidate.userId,
  fullName: candidate.fullName,
  email: candidate.email,
  programId: candidate.programId,
  programName: candidate.programName,
  programCode: candidate.programCode,
  batchId: candidate.batchId,
  batchName: candidate.batchName,
  batchCode: candidate.batchCode,
  candidateCode: candidate.candidateCode,
  currentPhase: candidate.currentPhase,
  currentDesignation: candidate.currentDesignation,
  currentMonthlyFee: candidate.currentMonthlyFee,
  currentPhaseStartDate: candidate.currentPhaseStartDate,
  status: candidate.status,
  isActive: candidate.isActive,
  createdAt: candidate.createdAt.toISOString(),
  updatedAt: candidate.updatedAt.toISOString(),
  deletedAt: candidate.deletedAt?.toISOString() ?? null,
});

const toOptionsResponse = (options: CandidateOptionRecord) => options;

export class CandidatesService {
  constructor(private readonly repository = new CandidatesRepository()) {}

  async listCandidates(input: ListCandidatesInput, context: ActorContext) {
    const candidates = await this.repository.list({
      ...input,
      actorId: context.actorId,
      role: context.role,
    });

    return candidates.map(toCandidateResponse);
  }

  async listOptions(context: ActorContext) {
    const options = await this.repository.listOptions({
      actorId: context.actorId,
      role: context.role,
    });

    return toOptionsResponse(options);
  }

  async createCandidate(input: CreateCandidateInput, context: ActorContext) {
    if (!["Super Admin", "Program Admin"].includes(context.role)) {
      throw new HttpError(
        403,
        "forbidden",
        "Only Super Admins and Program Admins can enroll candidates.",
      );
    }

    const existingUser = await this.repository.findUserByEmail(input.email);

    if (existingUser) {
      throw new HttpError(409, "user_email_exists", "A user with this email already exists.");
    }

    const existingCandidate = await this.repository.findByCode(input.candidateCode);

    if (existingCandidate) {
      throw new HttpError(
        409,
        "candidate_code_exists",
        "A candidate with this code already exists.",
      );
    }

    const program = await this.repository.findProgramById(input.programId);

    if (!program || program.deletedAt || !program.isActive) {
      throw new HttpError(404, "program_not_found", "Active program not found.");
    }

    if (context.role === "Program Admin") {
      const canUseProgram = await this.repository.isProgramAssignedToUser(
        input.programId,
        context.actorId,
      );

      if (!canUseProgram) {
        throw new HttpError(
          403,
          "program_scope_denied",
          "You can enroll candidates only in assigned programs.",
        );
      }
    }

    if (input.batchId) {
      const batch = await this.repository.findBatchById(input.batchId);

      if (!batch || batch.deletedAt || !batch.isActive) {
        throw new HttpError(404, "batch_not_found", "Active batch not found.");
      }

      if (batch.programId !== input.programId) {
        throw new HttpError(
          400,
          "batch_program_mismatch",
          "Batch must belong to the selected program.",
        );
      }
    }

    const candidate = await this.repository.create({
      ...input,
      passwordHash: await hashPassword(input.password),
      actorId: context.actorId,
    });

    if (!candidate) {
      throw new HttpError(500, "candidate_create_failed", "Failed to enroll candidate.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "candidate.enrolled",
      entityType: "candidate",
      entityId: candidate.id,
      newValue: toCandidateResponse(candidate),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "candidate.enrolled",
      entityType: "candidate",
      entityId: candidate.id,
      actorType: "user",
      actorId: context.actorId,
      payload: toCandidateResponse(candidate),
    });

    return toCandidateResponse(candidate);
  }

  async archiveCandidate(id: string, context: ActorContext) {
    if (!["Super Admin", "Program Admin"].includes(context.role)) {
      throw new HttpError(
        403,
        "forbidden",
        "Only Super Admins and Program Admins can archive candidates.",
      );
    }

    const canAccess = await this.repository.canAccessCandidate({
      candidateId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(404, "candidate_not_found", "Candidate not found.");
    }

    const existingCandidate = await this.repository.findById(id);
    const archivedCandidate = await this.repository.archive(id, context.actorId);

    if (!existingCandidate || !archivedCandidate) {
      throw new HttpError(404, "candidate_not_found", "Candidate not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "candidate.archived",
      entityType: "candidate",
      entityId: id,
      oldValue: toCandidateResponse(existingCandidate),
      newValue: toCandidateResponse(archivedCandidate),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "candidate.archived",
      entityType: "candidate",
      entityId: id,
      actorType: "user",
      actorId: context.actorId,
      payload: toCandidateResponse(archivedCandidate),
    });

    return toCandidateResponse(archivedCandidate);
  }

  async restoreCandidate(id: string, context: ActorContext) {
    if (!["Super Admin", "Program Admin"].includes(context.role)) {
      throw new HttpError(
        403,
        "forbidden",
        "Only Super Admins and Program Admins can restore candidates.",
      );
    }

    const canAccess = await this.repository.canAccessCandidate({
      candidateId: id,
      actorId: context.actorId,
      role: context.role,
      includeArchived: true,
    });

    if (!canAccess) {
      throw new HttpError(404, "candidate_not_found", "Candidate not found.");
    }

    const existingCandidate = await this.repository.findById(id, true);
    const restoredCandidate = await this.repository.restore(id, context.actorId);

    if (!existingCandidate || !restoredCandidate) {
      throw new HttpError(404, "candidate_not_found", "Candidate not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "candidate.restored",
      entityType: "candidate",
      entityId: id,
      oldValue: toCandidateResponse(existingCandidate),
      newValue: toCandidateResponse(restoredCandidate),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "candidate.restored",
      entityType: "candidate",
      entityId: id,
      actorType: "user",
      actorId: context.actorId,
      payload: toCandidateResponse(restoredCandidate),
    });

    return toCandidateResponse(restoredCandidate);
  }
}
