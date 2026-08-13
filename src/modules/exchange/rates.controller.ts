import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { ratesQuerySchema, ratesHistoryQuerySchema } from "./rates.schema";
import { RatesService } from "./rates.service";
import { RateProviderError } from "./rate-provider";
import { findDisplayCurrencyByFirebaseUid } from "./rates.repository";

export class RatesController {
  constructor(
    private readonly ratesService = new RatesService(),
  ) {}

  getRates = async (
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

      const parsed = ratesQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Los datos enviados no son válidos",
            details: parsed.error.issues.map((issue) => ({
              field: issue.path.join("."),
              message: issue.message,
            })),
          },
        });
        return;
      }

      const base =
        parsed.data.base ??
        (await findDisplayCurrencyByFirebaseUid(firebaseUid)) ??
        "ARS";

      const rates = await this.ratesService.getRates(base);

      res.status(200).json({
        rates,
      });
    } catch (error) {
      if (error instanceof RateProviderError) {
        res.status(502).json({
          error: {
            code: "RATE_PROVIDER_UNAVAILABLE",
            message: error.message,
          },
        });
        return;
      }

      next(error);
    }
  };

  getRatesHistory = async (
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

      const parsed = ratesHistoryQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Los datos enviados no son vǭlidos",
            details: parsed.error.issues.map((issue) => ({
              field: issue.path.join("."),
              message: issue.message,
            })),
          },
        });
        return;
      }

      const { source, target, days } = parsed.data;

      const history = await this.ratesService.getRatesHistory(
        source,
        target,
        days,
      );

      res.status(200).json({
        history,
      });    } catch (error) {
      if (error instanceof RateProviderError) {
        res.status(502).json({
          error: {
            code: "RATE_PROVIDER_UNAVAILABLE",
            message: error.message,
          },
        });
        return;
      }

      next(error);
    }
  };
}
