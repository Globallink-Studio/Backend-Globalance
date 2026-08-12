import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/firebase-auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import {
  readProfile,
  updateProfile,
  deleteProfile,
} from "./users.controller";
import { completeProfileSchema } from "./users.schema";

export const usersRouter = Router();


usersRouter.get(
  "/profile",
  verifyFirebaseToken,
  readProfile,
);


usersRouter.patch(
  "/profile",
  verifyFirebaseToken,
  validateBody(completeProfileSchema),
  updateProfile,
);

usersRouter.delete(
  "/profile",
  verifyFirebaseToken,
  deleteProfile,
);
