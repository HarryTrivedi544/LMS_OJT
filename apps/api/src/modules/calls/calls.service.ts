import ical from "ical-generator";

import type { Role } from "@lms/shared";

import { publishCallScheduledEvent } from "../../events/publish-mqtt-event.js";
import { sendEmail } from "../../integrations/email/send-email.js";
import { dispatchWorkflowNotification } from "../../integrations/notifications/notification-dispatcher.js";
import { HttpError } from "../../errors/http-error.js";
import type { CreateCallInput, ListCallsInput, UpdateCallInput } from "./calls.schema.js";
import { CallsRepository, type CallRecord } from "./calls.repository.js";

type ActorContext = {
  actorId: string;
  role: Role;
  ipAddress?: string;
  userAgent?: string;
};

const toCallResponse = (call: CallRecord) => ({
  id: call.id,
  candidateId: call.candidateId,
  userId: call.userId,
  fullName: call.fullName,
  email: call.email,
  candidateCode: call.candidateCode,
  programId: call.programId,
  programName: call.programName,
  batchId: call.batchId,
  batchName: call.batchName,
  scheduledBy: call.scheduledBy,
  schedulerName: call.schedulerName,
  title: call.title,
  description: call.description,
  scheduledStartAt: call.scheduledStartAt.toISOString(),
  scheduledEndAt: call.scheduledEndAt.toISOString(),
  meetingLink: call.meetingLink,
  status: call.status,
  cancelledAt: call.cancelledAt?.toISOString() ?? null,
  isActive: call.isActive,
  createdAt: call.createdAt.toISOString(),
  updatedAt: call.updatedAt.toISOString(),
  deletedAt: call.deletedAt?.toISOString() ?? null,
});

const buildCallInviteIcal = (call: CallRecord) => {
  const calendar = ical({ name: "LMS OJT Call Invite" });

  calendar.createEvent({
    start: call.scheduledStartAt,
    end: call.scheduledEndAt,
    summary: call.title,
    description: call.description ?? undefined,
    url: call.meetingLink ?? undefined,
    organizer: {
      name: call.schedulerName,
      email: "noreply@lms-ojt.local",
    },
  });

  return calendar.toString();
};

const deliverCallInvite = async (call: CallRecord) => {
  const callResponse = toCallResponse(call);
  const startLabel = call.scheduledStartAt.toLocaleString();

  await dispatchWorkflowNotification({
    userId: call.userId,
    triggerName: "call.scheduled",
    title: "Call scheduled",
    body: `${call.schedulerName} scheduled "${call.title}" on ${startLabel}.`,
    metadata: callResponse,
  });

  await publishCallScheduledEvent({
    userId: call.userId,
    batchId: call.batchId,
    payload: callResponse,
  });

  const icalContent = buildCallInviteIcal(call);

  await sendEmail({
    to: call.email,
    subject: `Call invite: ${call.title}`,
    text: `You have a scheduled call on ${startLabel}.${call.meetingLink ? `\nJoin: ${call.meetingLink}` : ""}`,
    icalAttachment: {
      filename: "call-invite.ics",
      content: icalContent,
    },
  });
};

const ensureValidCallSchedule = (scheduledStartAt: Date, scheduledEndAt: Date) => {
  if (
    Number.isNaN(scheduledStartAt.getTime()) ||
    Number.isNaN(scheduledEndAt.getTime()) ||
    scheduledEndAt <= scheduledStartAt
  ) {
    throw new HttpError(
      400,
      "call_invalid_schedule",
      "Call end time must be after start time.",
    );
  }
};

export class CallsService {
  constructor(private readonly repository = new CallsRepository()) {}

  async listCalls(input: ListCallsInput, context: ActorContext) {
    const callList = await this.repository.list({
      ...input,
      actorId: context.actorId,
      role: context.role,
    });

    return callList.map(toCallResponse);
  }

  async getCall(id: string, context: ActorContext) {
    const canAccess = await this.repository.canAccessCall({
      callId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(404, "call_not_found", "Call not found.");
    }

    const call = await this.repository.findById(id);

    if (!call) {
      throw new HttpError(404, "call_not_found", "Call not found.");
    }

    return toCallResponse(call);
  }

  async createCall(input: CreateCallInput, context: ActorContext) {
    if (!["Super Admin", "Program Admin", "Program Lead"].includes(context.role)) {
      throw new HttpError(
        403,
        "call_scheduler_required",
        "Only admins and leads can schedule calls.",
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

    const scheduledStartAt = new Date(input.scheduledStartAt);
    const scheduledEndAt = new Date(input.scheduledEndAt);

    ensureValidCallSchedule(scheduledStartAt, scheduledEndAt);

    const call = await this.repository.create({
      candidateId: input.candidateId,
      scheduledBy: context.actorId,
      title: input.title,
      description: input.description,
      scheduledStartAt,
      scheduledEndAt,
      meetingLink: input.meetingLink,
    });

    if (!call) {
      throw new HttpError(500, "call_create_failed", "Failed to schedule call.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "call.scheduled",
      entityType: "call",
      entityId: call.id,
      newValue: toCallResponse(call),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "call.scheduled",
      entityType: "call",
      entityId: call.id,
      actorType: "user",
      actorId: context.actorId,
      payload: toCallResponse(call),
    });
    await deliverCallInvite(call);

    return toCallResponse(call);
  }

  async updateCall(id: string, input: UpdateCallInput, context: ActorContext) {
    if (!["Super Admin", "Program Admin", "Program Lead"].includes(context.role)) {
      throw new HttpError(
        403,
        "call_scheduler_required",
        "Only admins and leads can reschedule calls.",
      );
    }

    const canAccess = await this.repository.canAccessCall({
      callId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(404, "call_not_found", "Call not found.");
    }

    const existingCall = await this.repository.findById(id);
    if (!existingCall) {
      throw new HttpError(404, "call_not_found", "Call not found.");
    }

    const scheduledStartAt = input.scheduledStartAt
      ? new Date(input.scheduledStartAt)
      : existingCall.scheduledStartAt;
    const scheduledEndAt = input.scheduledEndAt
      ? new Date(input.scheduledEndAt)
      : existingCall.scheduledEndAt;

    ensureValidCallSchedule(scheduledStartAt, scheduledEndAt);

    const updatedCall = await this.repository.update(id, {
      title: input.title,
      description: input.description,
      scheduledStartAt: input.scheduledStartAt ? scheduledStartAt : undefined,
      scheduledEndAt: input.scheduledEndAt ? scheduledEndAt : undefined,
      meetingLink: input.meetingLink,
      actorId: context.actorId,
    });

    if (!updatedCall) {
      throw new HttpError(404, "call_not_found", "Call not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "call.rescheduled",
      entityType: "call",
      entityId: id,
      oldValue: toCallResponse(existingCall),
      newValue: toCallResponse(updatedCall),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await deliverCallInvite(updatedCall);

    return toCallResponse(updatedCall);
  }

  async cancelCall(id: string, context: ActorContext) {
    if (!["Super Admin", "Program Admin", "Program Lead"].includes(context.role)) {
      throw new HttpError(
        403,
        "call_canceller_required",
        "Only admins and leads can cancel calls.",
      );
    }

    const canAccess = await this.repository.canAccessCall({
      callId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(404, "call_not_found", "Call not found.");
    }

    const existingCall = await this.repository.findById(id);
    const cancelledCall = await this.repository.cancel(id, context.actorId);

    if (!existingCall || !cancelledCall) {
      throw new HttpError(404, "call_not_found", "Call not found.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "call.cancelled",
      entityType: "call",
      entityId: id,
      oldValue: toCallResponse(existingCall),
      newValue: toCallResponse(cancelledCall),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    await dispatchWorkflowNotification({
      userId: cancelledCall.userId,
      triggerName: "call.cancelled",
      title: "Call cancelled",
      body: `The call "${cancelledCall.title}" has been cancelled.`,
      metadata: toCallResponse(cancelledCall),
    });

    return toCallResponse(cancelledCall);
  }
}
