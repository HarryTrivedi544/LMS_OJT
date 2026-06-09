import type { ActorType, DomainEventName } from "@lms/shared";

export type DomainEvent = {
  eventName: DomainEventName;
  entityType: string;
  entityId: string;
  actorType: ActorType;
  actorId?: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
};

export const createDomainEvent = (
  event: Omit<DomainEvent, "occurredAt">,
): DomainEvent => ({
  ...event,
  occurredAt: new Date(),
});
