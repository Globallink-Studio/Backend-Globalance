import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiClient, GeminiClientError } from "../src/modules/ai/gemini.client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GeminiClient", () => {
  it("responde en modo mock cuando no hay apiKey", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const client = new GeminiClient({ apiKey: "", model: "gemini-2.5-flash" });

    const reply = await client.generate("hola");

    expect(reply).toContain("modo demostración");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("devuelve el texto de la respuesta de Gemini", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: "  Tenés 100 USD  " }],
              },
            },
          ],
        }),
      }),
    );

    const client = new GeminiClient({ apiKey: "key", model: "m1" });

    const reply = await client.generate("¿Cuánto tengo?");

    expect(reply).toBe("Tenés 100 USD");
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/models/m1:generateContent"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          contents: [{ parts: [{ text: "¿Cuánto tengo?" }] }],
        }),
      }),
    );
  });

  it("lanza GeminiClientError cuando el proveedor falla", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );

    const client = new GeminiClient({ apiKey: "key", model: "m1" });

    await expect(client.generate("hola")).rejects.toBeInstanceOf(
      GeminiClientError,
    );
  });
});
