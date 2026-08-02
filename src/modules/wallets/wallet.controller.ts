import { NextFunction, Request, Response } from "express";
import { WalletService } from "./wallet.service";

export class WalletController {
  constructor(
    private readonly walletService = new WalletService()
  ) {}

  getWallet = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({
          message: "Usuario no autenticado",
        });
        return;
      }

      const wallet =
        await this.walletService.getWalletByFirebaseUid(firebaseUid);

      res.status(200).json(wallet);
    } catch (error) {
      next(error);
    }
  };
}