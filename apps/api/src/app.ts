import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found-handler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { candidateLogsRouter } from "./modules/candidate-logs/candidate-logs.routes.js";
import { callsRouter } from "./modules/calls/calls.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { candidatesRouter } from "./modules/candidates/candidates.routes.js";
import { filesRouter } from "./modules/files/files.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { kpiReviewsRouter } from "./modules/kpi-reviews/kpi-reviews.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { programsRouter } from "./modules/programs/programs.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { taskBriefsRouter } from "./modules/task-briefs/task-briefs.routes.js";
import { timesheetsRouter } from "./modules/timesheets/timesheets.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  app.use("/api/v1/health", healthRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/programs", programsRouter);
  app.use("/api/v1/reports", reportsRouter);
  app.use("/api/v1/candidates", candidatesRouter);
  app.use("/api/v1/candidate-logs", candidateLogsRouter);
  app.use("/api/v1/files", filesRouter);
  app.use("/api/v1/timesheets", timesheetsRouter);
  app.use("/api/v1/task-briefs", taskBriefsRouter);
  app.use("/api/v1/kpi-reviews", kpiReviewsRouter);
  app.use("/api/v1/notifications", notificationsRouter);
  app.use("/api/v1/chat", chatRouter);
  app.use("/api/v1/calls", callsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
