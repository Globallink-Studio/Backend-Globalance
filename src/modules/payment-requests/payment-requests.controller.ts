import type {
  NextFunction,
  Request,
  Response,
} from "express";
import type { CreatePaymentRequestInput } from "./payment-requests.schema";
import {
  PaymentRequestsService,
  PaymentRequestsServiceError,
} from "./payment-requests.service";

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
}