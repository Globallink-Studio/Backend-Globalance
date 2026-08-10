import { env } from "../../config/env";

export class GeminiClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiClientError";
  }
}

const REQUEST_TIMEOUT_MS = 15000;
const GENERATE_CONTENT_PATH =
  "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiClientConfig {
  apiKey: string;
  model: string;
}

export class GeminiClient {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config?: Partial<GeminiClientConfig>) {
    this.apiKey = config?.apiKey ?? env.GEMINI_API_KEY;
    this.model = config?.model ?? env.GEMINI_MODEL;
  }

  async generate(prompt: string): Promise<string> {
    if (!this.apiKey) {
      return this.mockReply();
    }

    try {
      const response = await fetch(
        `${GENERATE_CONTENT_PATH}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Gemini respondió con status ${response.status}`,
        );
      }

      const data = (await response.json()) as {
        candidates?: {
          content?: {
            parts?: { text?: string }[];
          };
        }[];
      };

      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!text) {
        throw new Error("Gemini no devolvió texto en la respuesta");
      }

      return text;
    } catch (error) {
      if (error instanceof GeminiClientError) {
        throw error;
      }

      throw new GeminiClientError(
        "No se pudo contactar al proveedor de IA",
      );
    }
  }

  private mockReply(): string {
    return (
      "Estoy funcionando en modo demostración: todavía no se " +
      "configuró la clave de Gemini. Cuando se active la " +
      "integración, podré analizar tus saldos y movimientos en " +
      "detalle para responder consultas sobre tu cuenta."
    );
  }
}
