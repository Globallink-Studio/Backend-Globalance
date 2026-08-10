import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { AiService } from "./ai.service";
import { GeminiClientError } from "./gemini.client";

export class AiController {
  constructor(
    private readonly aiService = new AiService(),
  ) {}

  sendMessage = async (
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

      const message = req.body?.message;

      const reply = await this.aiService.sendMessage(
        firebaseUid,
        message,
      );

      res.status(200).json({ reply });
    } catch (error) {
      if (error instanceof GeminiClientError) {
        res.status(502).json({
          error: {
            code: "AI_PROVIDER_UNAVAILABLE",
            message: error.message,
          },
        });
        return;
      }

      next(error);
    }
  };
}
