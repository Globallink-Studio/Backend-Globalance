import type {
  NextFunction,
  Request,
  Response,
} from "express";
import type {
  CreatePaymentRequestInput,
  ListPaymentRequestsQuery,
} from "./payment-requests.schema";
import {
  PaymentRequestsService,
  PaymentRequestsServiceError,
} from "./payment-requests.service";
import {
  listPaymentRequestsQuerySchema,
  paymentRequestIdSchema,
  paymentRequestTokenSchema,
} from "./payment-requests.schema";

export class PaymentRequestsController {
  constructor(
    private readonly paymentRequestsService =
      new PaymentRequestsService(),
  ) {}

  create = async (
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

      const paymentRequest =
        await this.paymentRequestsService.createPaymentRequest(
          firebaseUid,
          req.body as CreatePaymentRequestInput,
        );

      res.status(201).json({
        message: "Solicitud de cobro creada correctamente",
        paymentRequest,
      });
    } catch (error) {
      if (error instanceof PaymentRequestsServiceError) {
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

    cancel = async (
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

      const idResult = paymentRequestIdSchema.safeParse(
        req.params.id,
      );

      if (!idResult.success) {
        res.status(400).json({
          error: {
            code: "INVALID_PAYMENT_REQUEST_ID",
            message:
              "El identificador de la solicitud no es válido",
          },
        });
        return;
      }

      const paymentRequest =
        await this.paymentRequestsService
          .cancelPaymentRequest(
            firebaseUid,
            idResult.data,
          );

      res.status(200).json({
        message: "Solicitud de cobro cancelada correctamente",
        paymentRequest,
      });
    } catch (error) {
      if (error instanceof PaymentRequestsServiceError) {
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

    pay = async (
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

      const tokenResult =
        paymentRequestTokenSchema.safeParse(
          req.params.paymentToken,
        );

      if (!tokenResult.success) {
        res.status(400).json({
          error: {
            code: "INVALID_PAYMENT_TOKEN",
            message: "El token de pago no es válido",
          },
        });
        return;
      }

      const idempotencyKey =
        req.header("Idempotency-Key");

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

      const paymentRequest =
        await this.paymentRequestsService
          .payPaymentRequest(
            firebaseUid,
            tokenResult.data,
            idempotencyKey,
          );

      res.status(200).json({
        message: "Solicitud de cobro pagada correctamente",
        paymentRequest,
      });
    } catch (error) {
      if (error instanceof PaymentRequestsServiceError) {
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

    getByToken = async (
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

      const tokenResult =
        paymentRequestTokenSchema.safeParse(
          req.params.paymentToken,
        );

      if (!tokenResult.success) {
        res.status(400).json({
          error: {
            code: "INVALID_PAYMENT_TOKEN",
            message: "El token de pago no es válido",
          },
        });
        return;
      }

      const paymentRequest =
        await this.paymentRequestsService
          .getPaymentRequestByToken(
            firebaseUid,
            tokenResult.data,
          );

      res.status(200).json({
        paymentRequest,
      });
    } catch (error) {
      if (error instanceof PaymentRequestsServiceError) {
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

    list = async (
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
        listPaymentRequestsQuerySchema.safeParse(
          req.query,
        );

      if (!queryResult.success) {
        res.status(400).json({
          error: {
            code: "INVALID_QUERY",
            message:
              "Los filtros del listado no son válidos",
            details: queryResult.error.issues.map(
              (issue) => ({
                field: issue.path.join("."),
                message: issue.message,
              }),
            ),
          },
        });
        return;
      }

      const paymentRequests =
        await this.paymentRequestsService
          .listPaymentRequests(
            firebaseUid,
            queryResult.data as ListPaymentRequestsQuery,
          );

      res.status(200).json({
        paymentRequests,
        pagination: {
          limit: queryResult.data.limit,
          offset: queryResult.data.offset,
          returned: paymentRequests.length,
        },
      });
    } catch (error) {
      if (error instanceof PaymentRequestsServiceError) {
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