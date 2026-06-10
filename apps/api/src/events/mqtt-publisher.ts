import mqtt from "mqtt";

import { env } from "../config/env.js";

export const publishMqttEvent = async (
  topic: string,
  payload: Record<string, unknown>,
) => {
  try {
    const client = mqtt.connect(env.MQTT_URL, {
      username: env.MQTT_USERNAME,
      password: env.MQTT_PASSWORD,
    });

    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => resolve());
      client.once("error", (error) => reject(error));
    });

    client.publish(topic, JSON.stringify(payload));
    client.end();
  } catch (error) {
    console.error(`Failed to publish MQTT event to ${topic}.`, error);
  }
};
