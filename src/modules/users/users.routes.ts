import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/firebase-auth.middleware";
import {
  readProfile,
  updateProfile,
} from "./users.controller";

export const usersRouter = Router();

usersRouter.get(
  "/profile",
  verifyFirebaseToken,
  readProfile,
);

usersRouter.patch(
  "/profile",
  verifyFirebaseToken,
  updateProfile,
);