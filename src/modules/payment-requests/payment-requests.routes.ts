import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/firebase-auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { PaymentRequestsController } from "./payment-requests.controller";
import { createPaymentRequestSchema } from "./payment-requests.schema";

const paymentRequestsRouter = Router();
const paymentRequestsController =
  new PaymentRequestsController();

paymentRequestsRouter.post(
  "/",
  verifyFirebaseToken,
  validateBody(createPaymentRequestSchema),
  paymentRequestsController.create,
);

paymentRequestsRouter.patch(
  "/:id/cancel",
  verifyFirebaseToken,
  paymentRequestsController.cancel,
);

export { paymentRequestsRouter };