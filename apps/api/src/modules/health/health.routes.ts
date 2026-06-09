import { Router } from "express";

import { getHealth } from "./health.service.js";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  response.json({
    success: true,
    data: getHealth(),
  });
});
