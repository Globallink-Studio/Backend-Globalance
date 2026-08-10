import { describe, expect, it, vi } from "vitest";

const { contextBuilderMock, geminiClientMock, buildPromptMock } =
  vi.hoisted(() => ({
    contextBuilderMock: { build: vi.fn() },
    geminiClientMock: { generate: vi.fn() },
    buildPromptMock: vi.fn(),
  }));

vi.mock("../src/modules/ai/context-builder", () => ({
  ContextBuilder: vi.fn(() => contextBuilderMock),
  buildPrompt: buildPromptMock,
}));

vi.mock("../src/modules/ai/gemini.client", () => ({
  GeminiClient: vi.fn(() => geminiClientMock),
  GeminiClientError: class GeminiClientError extends Error {},
}));

import { ContextBuilder } from "../src/modules/ai/context-builder";
import { GeminiClient } from "../src/modules/ai/gemini.client";
import { AiService } from "../src/modules/ai/ai.service";

describe("AiService.sendMessage", () => {
  it("arma el contexto y el prompt, y devuelve la respuesta de la IA", async () => {
    const context = {
      user: { email: "a@b.com", display_currency: "ARS" },
      balances: [{ currency: "USD", amount: "100" }],
      movements: [],
    };
    contextBuilderMock.build.mockResolvedValue(context);
    buildPromptMock.mockReturnValue("prompt armado");
    geminiClientMock.generate.mockResolvedValue("Tenés 100 USD");

    const service = new AiService(
      contextBuilderMock as unknown as ContextBuilder,
      geminiClientMock as unknown as GeminiClient,
    );

    const reply = await service.sendMessage("fb1", "¿Cuánto tengo?");

    expect(reply).toBe("Tenés 100 USD");
    expect(contextBuilderMock.build).toHaveBeenCalledWith("fb1");
    expect(buildPromptMock).toHaveBeenCalledWith(
      context,
      "¿Cuánto tengo?",
    );
    expect(geminiClientMock.generate).toHaveBeenCalledWith(
      "prompt armado",
    );
  });
});
