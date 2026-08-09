import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/modules/exchange/rate-provider", () => ({
  RateProvider: vi.fn(),
  RateProviderError: class RateProviderError extends Error {},
}));

import { RateProvider } from "../src/modules/exchange/rate-provider";
import { QuotesService } from "../src/modules/exchange/quotes.service";

const getRateMock = vi.fn();

describe("QuotesService", () => {
  let service: QuotesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new QuotesService(
      { getRate: getRateMock } as unknown as RateProvider,
    );
  });

  it("calcula targetAmount con redondeo a 8 decimales y rate a 10", async () => {
    getRateMock.mockResolvedValue({
      source: "USD",
      target: "ARS",
      rate: 1498.123456789,
      provider: "frankfurter",
      fetchedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const quote = await service.getQuote("USD", "ARS", "10");

    expect(quote.targetAmount).toBe("14981.23456789");
    expect(quote.rate).toBe("1498.1234567890");
    expect(quote.sourceAmount).toBe("10.00000000");
  });

  it("fija expiresAt a 60 segundos del momento de la tasa", async () => {
    const fetchedAt = new Date("2026-01-01T00:00:00.000Z");
    getRateMock.mockResolvedValue({
      source: "USD",
      target: "ARS",
      rate: 1,
      provider: "frankfurter",
      fetchedAt,
    });

    const quote = await service.getQuote("USD", "ARS");

    expect(quote.fetchedAt).toEqual(fetchedAt);
    expect(quote.expiresAt.getTime() - quote.fetchedAt.getTime()).toBe(
      60_000,
    );
  });
});
