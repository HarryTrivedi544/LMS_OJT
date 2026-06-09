import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { authorizeRoles } from "../../middleware/authorize-roles.js";
import {
  archiveUser,
  createUser,
  listUsers,
  restoreUser,
  updateUser,
} from "./users.controller.js";

export const usersRouter = Router();

usersRouter.use(authenticate, authorizeRoles("Super Admin"));

usersRouter.get("/", listUsers);
usersRouter.post("/", createUser);
usersRouter.patch("/:id", updateUser);
usersRouter.post("/:id/archive", archiveUser);
usersRouter.post("/:id/restore", restoreUser);
