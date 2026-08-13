import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  contextBuilderMock,
  geminiClientMock,
  buildPromptMock,
  assistantRepositoryMock,
} = vi.hoisted(() => ({
  contextBuilderMock: { build: vi.fn() },
  geminiClientMock: { generate: vi.fn() },
  buildPromptMock: vi.fn(),
  assistantRepositoryMock: {
    insertAssistantMessage: vi.fn(),
    findRecentAssistantMessages: vi.fn(),
    deleteAssistantMessagesOlderThan: vi.fn(),
  },
}));

vi.mock("../src/modules/ai/context-builder", () => ({
  ContextBuilder: vi.fn(() => contextBuilderMock),
  buildPrompt: buildPromptMock,
}));

vi.mock("../src/modules/ai/gemini.client", () => ({
  GeminiClient: vi.fn(() => geminiClientMock),
  GeminiClientError: class GeminiClientError extends Error {},
}));

vi.mock("../src/modules/ai/assistant.repository", () => ({
  insertAssistantMessage:
    assistantRepositoryMock.insertAssistantMessage,
  findRecentAssistantMessages:
    assistantRepositoryMock.findRecentAssistantMessages,
  deleteAssistantMessagesOlderThan:
    assistantRepositoryMock.deleteAssistantMessagesOlderThan,
}));

import { ContextBuilder } from "../src/modules/ai/context-builder";
import { GeminiClient } from "../src/modules/ai/gemini.client";
import { AiService } from "../src/modules/ai/ai.service";

describe("AiService.sendMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("limpieza TTL, carga el historial, guarda ambos mensajes y devuelve la respuesta", async () => {
    const context = {
      user: {
        id: "u1",
        email: "a@b.com",
        display_currency: "ARS",
      },
      balances: [{ currency: "USD", amount: "100" }],
      movements: [],
    };
    contextBuilderMock.build.mockResolvedValue(context);
    assistantRepositoryMock.findRecentAssistantMessages.mockResolvedValue([
      {
        id: "m1",
        user_id: "u1",
        role: "user" as const,
        content: "¿cuánto tengo?",
        created_at: new Date(),
      },
    ]);
    buildPromptMock.mockReturnValue("prompt armado");
    geminiClientMock.generate.mockResolvedValue("Tenés 100 USD");

    const service = new AiService(
      contextBuilderMock as unknown as ContextBuilder,
      geminiClientMock as unknown as GeminiClient,
    );

    const reply = await service.sendMessage("fb1", "¿Cuánto tengo?");

    expect(reply).toBe("Tenés 100 USD");
    expect(contextBuilderMock.build).toHaveBeenCalledWith("fb1");
    expect(
      assistantRepositoryMock.deleteAssistantMessagesOlderThan,
    ).toHaveBeenCalledWith("u1", 7);
    expect(
      assistantRepositoryMock.findRecentAssistantMessages,
    ).toHaveBeenCalledWith("u1", 10);
    expect(
      assistantRepositoryMock.insertAssistantMessage,
    ).toHaveBeenCalledWith("u1", "user", "¿Cuánto tengo?");
    expect(buildPromptMock).toHaveBeenCalledWith(
      context,
      "¿Cuánto tengo?",
      [{ role: "user", content: "¿cuánto tengo?" }],
    );
    expect(geminiClientMock.generate).toHaveBeenCalledWith(
      "prompt armado",
    );
    expect(
      assistantRepositoryMock.insertAssistantMessage,
    ).toHaveBeenCalledWith("u1", "assistant", "Tenés 100 USD");
  });
});
