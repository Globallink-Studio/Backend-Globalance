import { Router } from "express";
import { EmailsController } from "./emails.controller";
import { verifyFirebaseToken } from "../../middlewares/firebase-auth.middleware";

const emailsRouter = Router();
const emailsController = new EmailsController();

emailsRouter.post(
  "/deliveries/:deliveryId/retry",
  verifyFirebaseToken,
  emailsController.retryFailedEmail,
);

export { emailsRouter };