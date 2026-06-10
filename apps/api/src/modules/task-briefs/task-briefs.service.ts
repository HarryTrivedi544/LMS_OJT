import type { Role } from "@lms/shared";

import {
  notifyTaskAssigned,
  notifyTaskRevisionRequired,
  notifyTaskSubmitted,
} from "../../integrations/notifications/workflow-notifications.js";
import { HttpError } from "../../errors/http-error.js";
import type {
  CreateTaskBriefInput,
  ListTaskBriefsInput,
  ReviewTaskBriefInput,
  SubmitTaskBriefInput,
} from "./task-briefs.schema.js";
import { TaskBriefsRepository, type TaskBriefRecord } from "./task-briefs.repository.js";

type ActorContext = {
  actorId: string;
  role: Role;
  ipAddress?: string;
  userAgent?: string;
};

const toTaskBriefResponse = (taskBrief: TaskBriefRecord) => ({
  id: taskBrief.id,
  candidateId: taskBrief.candidateId,
  userId: taskBrief.userId,
  fullName: taskBrief.fullName,
  email: taskBrief.email,
  candidateCode: taskBrief.candidateCode,
  programId: taskBrief.programId,
  programName: taskBrief.programName,
  batchId: taskBrief.batchId,
  batchName: taskBrief.batchName,
  assignedBy: taskBrief.assignedBy,
  assignedByName: taskBrief.assignedByName,
  title: taskBrief.title,
  description: taskBrief.description,
  taskReference: taskBrief.taskReference,
  priority: taskBrief.priority,
  dueDate: taskBrief.dueDate,
  status: taskBrief.status,
  acknowledgedAt: taskBrief.acknowledgedAt?.toISOString() ?? null,
  submissionSummary: taskBrief.submissionSummary,
  submissionDeliverables: taskBrief.submissionDeliverables,
  submittedAt: taskBrief.submittedAt?.toISOString() ?? null,
  reviewedAt: taskBrief.reviewedAt?.toISOString() ?? null,
  reviewedBy: taskBrief.reviewedBy,
  reviewNote: taskBrief.reviewNote,
  isActive: taskBrief.isActive,
  createdAt: taskBrief.createdAt.toISOString(),
  updatedAt: taskBrief.updatedAt.toISOString(),
  deletedAt: taskBrief.deletedAt?.toISOString() ?? null,
});

export class TaskBriefsService {
  constructor(private readonly repository = new TaskBriefsRepository()) {}

  async listTaskBriefs(input: ListTaskBriefsInput, context: ActorContext) {
    const taskBriefs = await this.repository.list({
      ...input,
      actorId: context.actorId,
      role: context.role,
    });

    return taskBriefs.map(toTaskBriefResponse);
  }

  async getTaskBrief(id: string, context: ActorContext) {
    const canAccess = await this.repository.canAccessTaskBrief({
      taskBriefId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(404, "task_brief_not_found", "Task brief not found.");
    }

    const taskBrief = await this.repository.findById(id);

    if (!taskBrief) {
      throw new HttpError(404, "task_brief_not_found", "Task brief not found.");
    }

    return toTaskBriefResponse(taskBrief);
  }

  async createTaskBrief(input: CreateTaskBriefInput, context: ActorContext) {
    if (!["Super Admin", "Program Admin", "Program Lead"].includes(context.role)) {
      throw new HttpError(
        403,
        "task_brief_assigner_required",
        "Only admins and leads can assign task briefs.",
      );
    }

    const canAccessCandidate = await this.repository.canAccessCandidate({
      candidateId: input.candidateId,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccessCandidate) {
      throw new HttpError(404, "candidate_not_found", "Candidate not found in your scope.");
    }

    const taskBrief = await this.repository.create({
      ...input,
      assignedBy: context.actorId,
    });

    if (!taskBrief) {
      throw new HttpError(500, "task_brief_create_failed", "Failed to assign task brief.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "task.assigned",
      entityType: "task_brief",
      entityId: taskBrief.id,
      newValue: toTaskBriefResponse(taskBrief),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "task.assigned",
      entityType: "task_brief",
      entityId: taskBrief.id,
      actorType: "user",
      actorId: context.actorId,
      payload: toTaskBriefResponse(taskBrief),
    });
    await notifyTaskAssigned({
      candidateId: taskBrief.candidateId,
      title: taskBrief.title,
      dueDate: taskBrief.dueDate,
    });

    return toTaskBriefResponse(taskBrief);
  }

  async acknowledgeTaskBrief(id: string, context: ActorContext) {
    if (context.role !== "Candidate") {
      throw new HttpError(
        403,
        "task_brief_candidate_required",
        "Only candidates can acknowledge task briefs.",
      );
    }

    const existingTaskBrief = await this.repository.findById(id);

    if (!existingTaskBrief || existingTaskBrief.userId !== context.actorId) {
      throw new HttpError(404, "task_brief_not_found", "Task brief not found.");
    }

    if (existingTaskBrief.status !== "draft") {
      throw new HttpError(
        409,
        "task_brief_acknowledge_not_allowed",
        "Only draft task briefs can be acknowledged.",
      );
    }

    if (existingTaskBrief.acknowledgedAt) {
      throw new HttpError(
        409,
        "task_brief_already_acknowledged",
        "This task brief has already been acknowledged.",
      );
    }

    const acknowledgedTaskBrief = await this.repository.acknowledge(id, context.actorId);

    if (!acknowledgedTaskBrief) {
      throw new HttpError(404, "task_brief_not_found", "Task brief not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "task.acknowledged",
      entityType: "task_brief",
      entityId: id,
      oldValue: toTaskBriefResponse(existingTaskBrief),
      newValue: toTaskBriefResponse(acknowledgedTaskBrief),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "task.acknowledged",
      entityType: "task_brief",
      entityId: id,
      actorType: "user",
      actorId: context.actorId,
      payload: toTaskBriefResponse(acknowledgedTaskBrief),
    });

    return toTaskBriefResponse(acknowledgedTaskBrief);
  }

  async submitTaskBrief(id: string, input: SubmitTaskBriefInput, context: ActorContext) {
    if (context.role !== "Candidate") {
      throw new HttpError(
        403,
        "task_brief_candidate_required",
        "Only candidates can submit task briefs.",
      );
    }

    const existingTaskBrief = await this.repository.findById(id);

    if (!existingTaskBrief || existingTaskBrief.userId !== context.actorId) {
      throw new HttpError(404, "task_brief_not_found", "Task brief not found.");
    }

    const allowedStatuses = ["draft", "revision_required"] as const;

    if (!allowedStatuses.includes(existingTaskBrief.status as (typeof allowedStatuses)[number])) {
      throw new HttpError(
        409,
        "task_brief_submit_not_allowed",
        "Only acknowledged draft or revision-required task briefs can be submitted.",
      );
    }

    if (existingTaskBrief.status === "draft" && !existingTaskBrief.acknowledgedAt) {
      throw new HttpError(
        409,
        "task_brief_acknowledgment_required",
        "Acknowledge the task brief before submitting.",
      );
    }

    const submittedTaskBrief = await this.repository.submit(id, {
      ...input,
      actorId: context.actorId,
    });

    if (!submittedTaskBrief) {
      throw new HttpError(404, "task_brief_not_found", "Task brief not found.");
    }

    const isResubmission = existingTaskBrief.status === "revision_required";
    const action = isResubmission ? "task.resubmitted" : "task.submitted";
    const eventName = isResubmission ? "task.resubmitted" : "task.submitted";

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action,
      entityType: "task_brief",
      entityId: id,
      oldValue: toTaskBriefResponse(existingTaskBrief),
      newValue: toTaskBriefResponse(submittedTaskBrief),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName,
      entityType: "task_brief",
      entityId: id,
      actorType: "user",
      actorId: context.actorId,
      payload: toTaskBriefResponse(submittedTaskBrief),
    });
    await notifyTaskSubmitted({
      candidateId: submittedTaskBrief.candidateId,
      fullName: submittedTaskBrief.fullName,
      title: submittedTaskBrief.title,
    });

    return toTaskBriefResponse(submittedTaskBrief);
  }

  async reviewTaskBrief(id: string, input: ReviewTaskBriefInput, context: ActorContext) {
    if (!["Super Admin", "Program Admin", "Program Lead"].includes(context.role)) {
      throw new HttpError(
        403,
        "task_brief_reviewer_required",
        "Only admins and leads can review task briefs.",
      );
    }

    const canAccess = await this.repository.canAccessTaskBrief({
      taskBriefId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(404, "task_brief_not_found", "Task brief not found.");
    }

    const existingTaskBrief = await this.repository.findById(id);
    const reviewedTaskBrief = await this.repository.review(id, {
      ...input,
      actorId: context.actorId,
    });

    if (!existingTaskBrief || !reviewedTaskBrief) {
      throw new HttpError(404, "task_brief_not_found", "Task brief not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: `task.${input.status}`,
      entityType: "task_brief",
      entityId: id,
      oldValue: toTaskBriefResponse(existingTaskBrief),
      newValue: toTaskBriefResponse(reviewedTaskBrief),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: `task.${input.status}`,
      entityType: "task_brief",
      entityId: id,
      actorType: "user",
      actorId: context.actorId,
      payload: toTaskBriefResponse(reviewedTaskBrief),
    });

    if (input.status === "revision_required") {
      await notifyTaskRevisionRequired({
        candidateUserId: reviewedTaskBrief.userId,
        title: reviewedTaskBrief.title,
        reviewNote: input.reviewNote,
      });
    }

    return toTaskBriefResponse(reviewedTaskBrief);
  }
}
