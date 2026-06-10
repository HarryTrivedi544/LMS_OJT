import { publishMqttEvent } from "./mqtt-publisher.js";
import { mqttTopics } from "./mqtt-topics.js";

export const publishChatMessageEvent = async (
  roomId: string,
  payload: Record<string, unknown>,
) => {
  await publishMqttEvent(mqttTopics.chatRoomEvents(roomId), {
    eventName: "chat.message.sent",
    ...payload,
  });
};

export const publishCallScheduledEvent = async (input: {
  userId: string;
  batchId?: string | null;
  payload: Record<string, unknown>;
}) => {
  await publishMqttEvent(mqttTopics.userNotifications(input.userId), {
    eventName: "call.scheduled",
    ...input.payload,
  });

  if (input.batchId) {
    await publishMqttEvent(mqttTopics.batchEvents(input.batchId), {
      eventName: "call.scheduled",
      ...input.payload,
    });
  }
};

export const publishUserNotificationEvent = async (
  userId: string,
  eventName: string,
  payload: Record<string, unknown>,
) => {
  await publishMqttEvent(mqttTopics.userNotifications(userId), {
    eventName,
    ...payload,
  });
};
