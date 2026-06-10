import { HttpError } from "../../errors/http-error.js";
import type {
  CreateBatchAssignmentInput,
  CreateBatchInput,
  CreateProgramAssignmentInput,
  CreateProgramInput,
  ListBatchesInput,
  ListProgramsInput,
  UpdateBatchInput,
  UpdateProgramInput,
} from "./programs.schema.js";
import {
  ProgramsRepository,
  type AssignmentRecord,
  type BatchRecord,
  type ProgramRecord,
} from "./programs.repository.js";

type ActorContext = {
  actorId: string;
  ipAddress?: string;
  userAgent?: string;
};

const toProgramResponse = (program: ProgramRecord) => ({
  id: program.id,
  name: program.name,
  code: program.code,
  status: program.status,
  isActive: program.isActive,
  createdAt: program.createdAt.toISOString(),
  updatedAt: program.updatedAt.toISOString(),
  deletedAt: program.deletedAt?.toISOString() ?? null,
});

const toBatchResponse = (batch: BatchRecord) => ({
  id: batch.id,
  programId: batch.programId,
  name: batch.name,
  code: batch.code,
  status: batch.status,
  isActive: batch.isActive,
  createdAt: batch.createdAt.toISOString(),
  updatedAt: batch.updatedAt.toISOString(),
  deletedAt: batch.deletedAt?.toISOString() ?? null,
});

const toAssignmentResponse = (assignment: AssignmentRecord) => ({
  id: assignment.id,
  userId: assignment.userId,
  fullName: assignment.fullName,
  email: assignment.email,
  role: assignment.role,
  createdAt: assignment.createdAt.toISOString(),
  deletedAt: assignment.deletedAt?.toISOString() ?? null,
});

export class ProgramsService {
  constructor(private readonly repository = new ProgramsRepository()) {}

  async listPrograms(input: ListProgramsInput) {
    const programs = await this.repository.listPrograms(input);

    return programs.map(toProgramResponse);
  }

  async createProgram(input: CreateProgramInput, context: ActorContext) {
    const existingProgram = await this.repository.findProgramByCode(input.code);

    if (existingProgram) {
      throw new HttpError(
        409,
        "program_code_exists",
        "A program with this code already exists.",
      );
    }

    const program = await this.repository.createProgram({
      ...input,
      actorId: context.actorId,
    });

    if (!program) {
      throw new HttpError(500, "program_create_failed", "Failed to create program.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "program.created",
      entityType: "program",
      entityId: program.id,
      newValue: toProgramResponse(program),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "program.created",
      entityType: "program",
      entityId: program.id,
      actorType: "user",
      actorId: context.actorId,
      payload: toProgramResponse(program),
    });

    return toProgramResponse(program);
  }

  async updateProgram(id: string, input: UpdateProgramInput, context: ActorContext) {
    const existingProgram = await this.repository.findProgramById(id);

    if (!existingProgram) {
      throw new HttpError(404, "program_not_found", "Program not found.");
    }

    if (input.code && input.code !== existingProgram.code) {
      const codeOwner = await this.repository.findProgramByCode(input.code);

      if (codeOwner && codeOwner.id !== id) {
        throw new HttpError(
          409,
          "program_code_exists",
          "A program with this code already exists.",
        );
      }
    }

    const updatedProgram = await this.repository.updateProgram(id, {
      ...input,
      actorId: context.actorId,
    });

    if (!updatedProgram) {
      throw new HttpError(404, "program_not_found", "Program not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "program.updated",
      entityType: "program",
      entityId: id,
      oldValue: toProgramResponse(existingProgram),
      newValue: toProgramResponse(updatedProgram),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "program.updated",
      entityType: "program",
      entityId: id,
      actorType: "user",
      actorId: context.actorId,
      payload: toProgramResponse(updatedProgram),
    });

    return toProgramResponse(updatedProgram);
  }

  async archiveProgram(id: string, context: ActorContext) {
    const existingProgram = await this.repository.findProgramById(id);

    if (!existingProgram) {
      throw new HttpError(404, "program_not_found", "Program not found.");
    }

    const archivedProgram = await this.repository.archiveProgram(id, context.actorId);

    if (!archivedProgram) {
      throw new HttpError(404, "program_not_found", "Program not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "program.archived",
      entityType: "program",
      entityId: id,
      oldValue: toProgramResponse(existingProgram),
      newValue: toProgramResponse(archivedProgram),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "program.archived",
      entityType: "program",
      entityId: id,
      actorType: "user",
      actorId: context.actorId,
      payload: toProgramResponse(archivedProgram),
    });

    return toProgramResponse(archivedProgram);
  }

  async restoreProgram(id: string, context: ActorContext) {
    const existingProgram = await this.repository.findProgramById(id, true);

    if (!existingProgram) {
      throw new HttpError(404, "program_not_found", "Program not found.");
    }

    const restoredProgram = await this.repository.restoreProgram(id, context.actorId);

    if (!restoredProgram) {
      throw new HttpError(404, "program_not_found", "Program not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "program.restored",
      entityType: "program",
      entityId: id,
      oldValue: toProgramResponse(existingProgram),
      newValue: toProgramResponse(restoredProgram),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "program.restored",
      entityType: "program",
      entityId: id,
      actorType: "user",
      actorId: context.actorId,
      payload: toProgramResponse(restoredProgram),
    });

    return toProgramResponse(restoredProgram);
  }

  async listBatches(programId: string, input: ListBatchesInput) {
    const program = await this.repository.findProgramById(programId, true);

    if (!program) {
      throw new HttpError(404, "program_not_found", "Program not found.");
    }

    const batches = await this.repository.listBatches(programId, input);

    return batches.map(toBatchResponse);
  }

  async createBatch(
    programId: string,
    input: CreateBatchInput,
    context: ActorContext,
  ) {
    const program = await this.repository.findProgramById(programId);

    if (!program) {
      throw new HttpError(404, "program_not_found", "Program not found.");
    }

    const existingBatch = await this.repository.findBatchByCode(input.code);

    if (existingBatch) {
      throw new HttpError(
        409,
        "batch_code_exists",
        "A batch with this code already exists.",
      );
    }

    const batch = await this.repository.createBatch({
      ...input,
      programId,
      actorId: context.actorId,
    });

    if (!batch) {
      throw new HttpError(500, "batch_create_failed", "Failed to create batch.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "batch.created",
      entityType: "batch",
      entityId: batch.id,
      newValue: toBatchResponse(batch),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "batch.created",
      entityType: "batch",
      entityId: batch.id,
      actorType: "user",
      actorId: context.actorId,
      payload: toBatchResponse(batch),
    });

    return toBatchResponse(batch);
  }

  async updateBatch(id: string, input: UpdateBatchInput, context: ActorContext) {
    const existingBatch = await this.repository.findBatchById(id);

    if (!existingBatch) {
      throw new HttpError(404, "batch_not_found", "Batch not found.");
    }

    if (input.code && input.code !== existingBatch.code) {
      const codeOwner = await this.repository.findBatchByCode(input.code);

      if (codeOwner && codeOwner.id !== id) {
        throw new HttpError(
          409,
          "batch_code_exists",
          "A batch with this code already exists.",
        );
      }
    }

    const updatedBatch = await this.repository.updateBatch(id, {
      ...input,
      actorId: context.actorId,
    });

    if (!updatedBatch) {
      throw new HttpError(404, "batch_not_found", "Batch not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "batch.updated",
      entityType: "batch",
      entityId: id,
      oldValue: toBatchResponse(existingBatch),
      newValue: toBatchResponse(updatedBatch),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "batch.updated",
      entityType: "batch",
      entityId: id,
      actorType: "user",
      actorId: context.actorId,
      payload: toBatchResponse(updatedBatch),
    });

    return toBatchResponse(updatedBatch);
  }

  async archiveBatch(id: string, context: ActorContext) {
    const existingBatch = await this.repository.findBatchById(id);

    if (!existingBatch) {
      throw new HttpError(404, "batch_not_found", "Batch not found.");
    }

    const archivedBatch = await this.repository.archiveBatch(id, context.actorId);

    if (!archivedBatch) {
      throw new HttpError(404, "batch_not_found", "Batch not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "batch.archived",
      entityType: "batch",
      entityId: id,
      oldValue: toBatchResponse(existingBatch),
      newValue: toBatchResponse(archivedBatch),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "batch.archived",
      entityType: "batch",
      entityId: id,
      actorType: "user",
      actorId: context.actorId,
      payload: toBatchResponse(archivedBatch),
    });

    return toBatchResponse(archivedBatch);
  }

  async restoreBatch(id: string, context: ActorContext) {
    const existingBatch = await this.repository.findBatchById(id, true);

    if (!existingBatch) {
      throw new HttpError(404, "batch_not_found", "Batch not found.");
    }

    const restoredBatch = await this.repository.restoreBatch(id, context.actorId);

    if (!restoredBatch) {
      throw new HttpError(404, "batch_not_found", "Batch not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "batch.restored",
      entityType: "batch",
      entityId: id,
      oldValue: toBatchResponse(existingBatch),
      newValue: toBatchResponse(restoredBatch),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "batch.restored",
      entityType: "batch",
      entityId: id,
      actorType: "user",
      actorId: context.actorId,
      payload: toBatchResponse(restoredBatch),
    });

    return toBatchResponse(restoredBatch);
  }

  async listProgramAssignments(programId: string) {
    const program = await this.repository.findProgramById(programId, true);

    if (!program) {
      throw new HttpError(404, "program_not_found", "Program not found.");
    }

    const assignments = await this.repository.listProgramAssignments(programId);

    return assignments.map(toAssignmentResponse);
  }

  async createProgramAssignment(
    programId: string,
    input: CreateProgramAssignmentInput,
    context: ActorContext,
  ) {
    const program = await this.repository.findProgramById(programId);

    if (!program) {
      throw new HttpError(404, "program_not_found", "Program not found.");
    }

    const user = await this.repository.findUserById(input.userId);

    if (!user || user.deletedAt || user.status !== "active") {
      throw new HttpError(404, "user_not_found", "Active user not found.");
    }

    if (user.role !== "Program Admin") {
      throw new HttpError(
        400,
        "invalid_assignment_role",
        "Only Program Admin users can be assigned to programs.",
      );
    }

    const existingAssignment = await this.repository.findProgramAssignment({
      programId,
      userId: input.userId,
      role: input.role,
    });

    if (existingAssignment) {
      throw new HttpError(
        409,
        "program_assignment_exists",
        "This user is already assigned to the program.",
      );
    }

    const assignment = await this.repository.createProgramAssignment({
      ...input,
      programId,
      actorId: context.actorId,
    });

    if (!assignment) {
      throw new HttpError(
        500,
        "program_assignment_create_failed",
        "Failed to assign program admin.",
      );
    }

    const createdAssignment = (await this.repository.listProgramAssignments(programId)).find(
      (currentAssignment) => currentAssignment.id === assignment.id,
    );

    if (!createdAssignment) {
      throw new HttpError(
        500,
        "program_assignment_create_failed",
        "Failed to load program assignment.",
      );
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "program.assignment.created",
      entityType: "program_assignment",
      entityId: assignment.id,
      newValue: {
        id: assignment.id,
        programId,
        userId: input.userId,
        role: input.role,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "program.assignment.created",
      entityType: "program_assignment",
      entityId: assignment.id,
      actorType: "user",
      actorId: context.actorId,
      payload: {
        programId,
        userId: input.userId,
        role: input.role,
      },
    });

    return toAssignmentResponse(createdAssignment);
  }

  async listBatchAssignments(batchId: string) {
    const batch = await this.repository.findBatchById(batchId, true);

    if (!batch) {
      throw new HttpError(404, "batch_not_found", "Batch not found.");
    }

    const assignments = await this.repository.listBatchAssignments(batchId);

    return assignments.map(toAssignmentResponse);
  }

  async createBatchAssignment(
    batchId: string,
    input: CreateBatchAssignmentInput,
    context: ActorContext,
  ) {
    const batch = await this.repository.findBatchById(batchId);

    if (!batch) {
      throw new HttpError(404, "batch_not_found", "Batch not found.");
    }

    const user = await this.repository.findUserById(input.userId);

    if (!user || user.deletedAt || user.status !== "active") {
      throw new HttpError(404, "user_not_found", "Active user not found.");
    }

    if (user.role !== "Program Lead") {
      throw new HttpError(
        400,
        "invalid_assignment_role",
        "Only Program Lead users can be assigned to batches.",
      );
    }

    const existingAssignment = await this.repository.findBatchAssignment({
      batchId,
      userId: input.userId,
      role: input.role,
    });

    if (existingAssignment) {
      throw new HttpError(
        409,
        "batch_assignment_exists",
        "This user is already assigned to the batch.",
      );
    }

    const assignment = await this.repository.createBatchAssignment({
      ...input,
      batchId,
      actorId: context.actorId,
    });

    if (!assignment) {
      throw new HttpError(
        500,
        "batch_assignment_create_failed",
        "Failed to assign program lead.",
      );
    }

    const createdAssignment = (await this.repository.listBatchAssignments(batchId)).find(
      (currentAssignment) => currentAssignment.id === assignment.id,
    );

    if (!createdAssignment) {
      throw new HttpError(
        500,
        "batch_assignment_create_failed",
        "Failed to load batch assignment.",
      );
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "batch.assignment.created",
      entityType: "batch_assignment",
      entityId: assignment.id,
      newValue: {
        id: assignment.id,
        batchId,
        userId: input.userId,
        role: input.role,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "batch.assignment.created",
      entityType: "batch_assignment",
      entityId: assignment.id,
      actorType: "user",
      actorId: context.actorId,
      payload: {
        batchId,
        userId: input.userId,
        role: input.role,
      },
    });

    return toAssignmentResponse(createdAssignment);
  }
}
