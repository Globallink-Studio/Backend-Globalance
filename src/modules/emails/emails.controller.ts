import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { emailDeliveryIdSchema } from "./emails.schema";
import {
  EmailsService,
  EmailsServiceError,
} from "./emails.service";

export class EmailsController {
  constructor(
    private readonly emailsService = new EmailsService(),
  ) {}

  retryFailedEmail = async (
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

      const parsedDeliveryId =
        emailDeliveryIdSchema.safeParse(
          req.params.deliveryId,
        );

      if (!parsedDeliveryId.success) {
        res.status(400).json({
          error: {
            code: "INVALID_EMAIL_DELIVERY_ID",
            message:
              parsedDeliveryId.error.issues[0].message,
          },
        });
        return;
      }

      const result =
        await this.emailsService.retryFailedEmail(
          parsedDeliveryId.data,
          firebaseUid,
        );

      res.status(200).json({
        message:
          "Reintento de correo procesado correctamente",
        result,
      });
    } catch (error) {
      if (error instanceof EmailsServiceError) {
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