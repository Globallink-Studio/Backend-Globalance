import type {
  NextFunction,
  Request,
  Response,
} from "express";
import type { DemoFundingInput } from "./transactions.schema";
import {
  TransactionsService,
  TransactionsServiceError,
} from "./transactions.service";

export class TransactionsController {
  constructor(
    private readonly transactionsService =
      new TransactionsService(),
  ) {}

  createDemoFunding = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        res.status(401).json({
          error: {
            code: "UNAUTHENTICATED",
            message: "Usuario no autenticado",
          },
        });
        return;
      }

      const idempotencyKey = req.header("Idempotency-Key");

      if (!idempotencyKey) {
        res.status(400).json({
          error: {
            code: "MISSING_IDEMPOTENCY_KEY",
            message:
              "El encabezado Idempotency-Key es obligatorio",
          },
        });
        return;
      }

      const transaction =
        await this.transactionsService.createDemoFunding(
          firebaseUid,
          req.body as DemoFundingInput,
          idempotencyKey,
        );

      res.status(201).json({
        message: "Carga de saldo demo realizada correctamente",
        transaction,
      });
    } catch (error) {
      if (error instanceof TransactionsServiceError) {
        res.status(error.statusCode).json({
          error: {
            code: error.code,
            message: error.message,
          },
        });
        return;
      }

      next(error);
    }
  };
}
