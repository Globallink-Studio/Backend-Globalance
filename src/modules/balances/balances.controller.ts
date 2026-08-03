import { NextFunction, Request, Response } from "express";
import { BalancesService } from "./balances.service";

export class BalancesController {
  constructor(
    private readonly balancesService = new BalancesService(),
  ) {}

  getBalances = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({
          message: "Usuario no autenticado",
        });
        return;
      }

      const balances =
        await this.balancesService.getBalancesByFirebaseUid(firebaseUid);

      res.status(200).json({
        balances,
      });
    } catch (error) {
      next(error);
    }
  };
}
