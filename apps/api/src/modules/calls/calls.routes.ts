import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import {
  cancelCall,
  createCall,
  getCall,
  listCalls,
  updateCall,
} from "./calls.controller.js";

export const callsRouter = Router();

callsRouter.use(authenticate);

callsRouter.get("/", listCalls);
callsRouter.get("/:id", getCall);
callsRouter.post("/", createCall);
callsRouter.put("/:id", updateCall);
callsRouter.post("/:id/cancel", cancelCall);
