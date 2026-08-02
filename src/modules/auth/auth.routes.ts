import { Router } from "express";
import {
  getCurrentUser,
  syncCurrentUser,
} from "./auth.controller";
import { verifyFirebaseToken } from "../../middlewares/firebase-auth.middleware";

const router = Router();

router.get("/me", verifyFirebaseToken, getCurrentUser);

router.post("/sync", verifyFirebaseToken, syncCurrentUser);

export default router;