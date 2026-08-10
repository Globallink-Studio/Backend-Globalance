import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/firebase-auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { AiController } from "./ai.controller";
import { assistantMessageSchema } from "./ai.schema";

const aiRouter = Router();
const aiController = new AiController();

aiRouter.post(
  "/assistant",
  verifyFirebaseToken,
  validateBody(assistantMessageSchema),
  aiController.sendMessage,
);

export { aiRouter };
