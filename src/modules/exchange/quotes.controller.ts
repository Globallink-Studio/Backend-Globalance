import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { quotesQuerySchema } from "./quotes.schema";
import { QuotesService } from "./quotes.service";
import { RateProviderError } from "./rate-provider";

export class QuotesController {
  constructor(
    private readonly quotesService = new QuotesService(),
  ) {}

  getQuote = async (
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

      const parsed = quotesQuerySchema.safeParse(req.query);

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

      const { source, target, amount } = parsed.data;

      const quote = await this.quotesService.getQuote(
        source,
        target,
        amount,
      );

      res.status(200).json({
        quote,
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
}
