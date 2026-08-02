import { Router } from "express";
import { verifyFirebaseToken} from "../../middlewares/firebase-auth.middleware";
import { updateProfile } from "./users.controller";

export const usersRouter = Router();

usersRouter.patch(
  "/profile",
  verifyFirebaseToken,
  updateProfile,
);