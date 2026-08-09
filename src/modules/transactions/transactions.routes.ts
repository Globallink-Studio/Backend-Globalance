import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/firebase-auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { TransactionsController } from "./transactions.controller";
import {
  demoFundingSchema,
  exchangeSchema,
} from "./transactions.schema";

const transactionsRouter = Router();
const transactionsController = new TransactionsController();

transactionsRouter.post(
  "/income",
  verifyFirebaseToken,
  validateBody(demoFundingSchema),
  transactionsController.createDemoFunding,
);

transactionsRouter.post(
  "/exchange",
  verifyFirebaseToken,
  validateBody(exchangeSchema),
  transactionsController.createExchange,
);

export { transactionsRouter };
