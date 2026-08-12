import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/firebase-auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import {
  completeProfileHandler,
  editProfileHandler,
  readProfile,
  deleteProfile,
} from "./users.controller";
import {
  completeProfileSchema,
  editProfileSchema,
} from "./users.schema";

export const usersRouter = Router();

usersRouter.get(
  "/profile",
  verifyFirebaseToken,
  readProfile,
);

usersRouter.post(
  "/profile",
  verifyFirebaseToken,
  validateBody(completeProfileSchema),
  completeProfileHandler,
);

usersRouter.patch(
  "/profile",
  verifyFirebaseToken,
  validateBody(editProfileSchema),
  editProfileHandler,
);

usersRouter.delete(
  "/profile",
  verifyFirebaseToken,
  deleteProfile,
);
