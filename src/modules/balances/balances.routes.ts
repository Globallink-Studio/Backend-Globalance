import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/firebase-auth.middleware";
import { BalancesController } from "./balances.controller";

const balancesRouter = Router();
const balancesController = new BalancesController();

balancesRouter.get(
  "/",
  verifyFirebaseToken,
  balancesController.getBalances,
);

export { balancesRouter };
