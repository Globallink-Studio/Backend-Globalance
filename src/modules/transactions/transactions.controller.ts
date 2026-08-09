import type {
  NextFunction,
  Request,
  Response,
} from "express";
import type {
  DemoFundingInput,
  ExchangeInput,
  InternalTransferInput,
  ListTransactionsQuery,
} from "./transactions.schema";
import { listTransactionsQuerySchema } from "./transactions.schema";
import { TransactionsService } from "./transactions.service";
import { TransactionsServiceError } from "../../errors/service-errors";

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

  createExchange = async (
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
        await this.transactionsService.createExchange(
          firebaseUid,
          req.body as ExchangeInput,
          idempotencyKey,
        );

      res.status(201).json({
        message: "Operación de cambio realizada correctamente",
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

  createInternalTransfer = async (
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
        await this.transactionsService.createInternalTransfer(
          firebaseUid,
          req.body as InternalTransferInput,
          idempotencyKey,
        );

      res.status(201).json({
        message:
          "Transferencia interna realizada correctamente",
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

  listTransactions = async (
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

      const queryResult =
        listTransactionsQuerySchema.safeParse(req.query);

      if (!queryResult.success) {
        res.status(400).json({
          error: {
            code: "INVALID_QUERY",
            message: "Los filtros del historial no son válidos",
            details: queryResult.error.issues.map((issue) => ({
              field: issue.path.join("."),
              message: issue.message,
            })),
          },
        });
        return;
      }

      const transactions =
        await this.transactionsService.listTransactions(
          firebaseUid,
          queryResult.data as ListTransactionsQuery,
        );

      res.status(200).json({
        transactions,
        pagination: {
          limit: queryResult.data.limit,
          offset: queryResult.data.offset,
          returned: transactions.length,
        },
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
