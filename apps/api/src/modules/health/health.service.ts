export const getHealth = () => ({
  service: "lms-api" as const,
  status: "ok" as const,
  timestamp: new Date().toISOString(),
});
