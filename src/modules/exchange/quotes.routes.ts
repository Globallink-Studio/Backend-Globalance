import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/firebase-auth.middleware";
import { QuotesController } from "./quotes.controller";

const quotesRouter = Router();
const quotesController = new QuotesController();

quotesRouter.get(
  "/quotes",
  verifyFirebaseToken,
  quotesController.getQuote,
);

export { quotesRouter };
