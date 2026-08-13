import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/firebase-auth.middleware";
import { RatesController } from "./rates.controller";

const ratesRouter = Router();
const ratesController = new RatesController();

ratesRouter.get(
  "/rates",
  verifyFirebaseToken,
  ratesController.getRates,
);

ratesRouter.get(
  "/rates/history",
  verifyFirebaseToken,
  ratesController.getRatesHistory,
);

export { ratesRouter };
