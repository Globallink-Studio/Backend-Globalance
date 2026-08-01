import { Router } from "express";
import { WalletController } from "./wallet.controller";

const walletRouter = Router();
const walletController = new WalletController();

walletRouter.get("/", walletController.getWallet);

export { walletRouter };