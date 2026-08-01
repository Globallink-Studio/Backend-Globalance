import { NextFunction, Request, Response } from "express";
import { WalletService } from "./wallet.service";

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
  };
};

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
      const authenticatedRequest = req as AuthenticatedRequest;
      const userId = authenticatedRequest.user?.id;

      if (!userId) {
        res.status(401).json({
          message: "Usuario no autenticado",
        });
        return;
      }

      const wallet = await this.walletService.getWalletByUserId(userId);

      res.status(200).json(wallet);
    } catch (error) {
      next(error);
    }
  };
}