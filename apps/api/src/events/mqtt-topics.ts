export const mqttTopics = {
  userNotifications: (userId: string) => `ojt/user/${userId}/notifications`,
  batchEvents: (batchId: string) => `ojt/batch/${batchId}/events`,
  chatRoomEvents: (roomId: string) => `ojt/chat/${roomId}/events`,
  taskUpdates: (taskId: string) => `ojt/task/${taskId}/updates`,
} as const;
