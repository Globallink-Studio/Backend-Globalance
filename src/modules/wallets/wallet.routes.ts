import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/firebase-auth.middleware";
import { WalletController } from "./wallet.controller";

const walletRouter = Router();
const walletController = new WalletController();

walletRouter.get(
  "/",
  verifyFirebaseToken,
  walletController.getWallet
);

export { walletRouter };