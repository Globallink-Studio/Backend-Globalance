import { env } from "../../config/env";

export class GeminiClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiClientError";
  }
}

export class GeminiNotConfiguredError extends GeminiClientError {
  constructor() {
    super(
      "La integración con Gemini no está configurada: falta GEMINI_API_KEY",
    );
    this.name = "GeminiNotConfiguredError";
  }
}

const REQUEST_TIMEOUT_MS = 15000;
const GENERATE_CONTENT_PATH =
  "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiClientConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
}

export const GEMINI_DEFAULT_TEMPERATURE = 0.2;
export const GEMINI_DEFAULT_MAX_OUTPUT_TOKENS = 500;

export class GeminiClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxOutputTokens: number;

  constructor(config?: Partial<GeminiClientConfig>) {
    this.apiKey = config?.apiKey ?? env.GEMINI_API_KEY;
    this.model = config?.model ?? env.GEMINI_MODEL;
    this.temperature =
      config?.temperature ?? GEMINI_DEFAULT_TEMPERATURE;
    this.maxOutputTokens =
      config?.maxOutputTokens ?? GEMINI_DEFAULT_MAX_OUTPUT_TOKENS;
  }

  async generate(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new GeminiNotConfiguredError();
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
            generationConfig: {
              temperature: this.temperature,
              maxOutputTokens: this.maxOutputTokens,
            },
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
}
