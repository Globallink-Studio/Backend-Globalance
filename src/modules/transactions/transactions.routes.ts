import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/firebase-auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { TransactionsController } from "./transactions.controller";
import { demoFundingSchema } from "./transactions.schema";

const transactionsRouter = Router();
const transactionsController = new TransactionsController();

transactionsRouter.post(
  "/income",
  verifyFirebaseToken,
  validateBody(demoFundingSchema),
  transactionsController.createDemoFunding,
);

export { transactionsRouter };
