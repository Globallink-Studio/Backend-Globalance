import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/modules/exchange/rate-provider", () => ({
  RateProvider: vi.fn(),
  RateProviderError: class RateProviderError extends Error {},
}));

import { RateProvider } from "../src/modules/exchange/rate-provider";
import { RatesService } from "../src/modules/exchange/rates.service";

const getRateMock = vi.fn();

describe("RatesService", () => {
  let service: RatesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RatesService(
      { getRate: getRateMock } as unknown as RateProvider,
    );
  });

  it("devuelve tasas para las otras monedas sin incluir la base", async () => {
    getRateMock
      .mockResolvedValueOnce({
        source: "USD",
        target: "ARS",
        rate: 1498.12,
        provider: "frankfurter",
        fetchedAt: new Date("2026-01-01T00:00:00.000Z"),
      })
      .mockResolvedValueOnce({
        source: "USD",
        target: "EUR",
        rate: 0.86612,
        provider: "frankfurter",
        fetchedAt: new Date("2026-01-01T00:00:00.000Z"),
      });

    const result = await service.getRates("USD");

    expect(Object.keys(result.rates).sort()).toEqual([
      "ARS",
      "EUR",
    ]);
    expect(result.rates.ARS).toBe("1498.1200000000");
    expect(result.rates.EUR).toBe("0.8661200000");
    expect(result.base).toBe("USD");
  });

  it("rechaza una moneda base no soportada con 400", async () => {
    await expect(service.getRates("GBP")).rejects.toMatchObject({
      statusCode: 400,
      code: "VALIDATION_ERROR",
    });
    expect(getRateMock).not.toHaveBeenCalled();
  });
});
