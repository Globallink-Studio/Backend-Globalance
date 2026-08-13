import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { findValidRateMock, upsertRateMock } = vi.hoisted(() => ({
  findValidRateMock: vi.fn(),
  upsertRateMock: vi.fn(),
}));

vi.mock("../src/modules/exchange/rate-cache.repository", () => ({
  findValidRate: findValidRateMock,
  upsertRate: upsertRateMock,
}));

const { upsertDailyQuoteMock } = vi.hoisted(() => ({
  upsertDailyQuoteMock: vi.fn(),
}));

vi.mock("../src/modules/exchange/quote-history.repository", () => ({
  upsertDailyQuote: upsertDailyQuoteMock,
}));

import {
  RateProvider,
  RateProviderError,
} from "../src/modules/exchange/rate-provider";

const fetchMock = vi.fn();

function fetchResponse(init?: {
  ok?: boolean;
  status?: number;
  json?: unknown;
}): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => init?.json ?? {},
  } as Response;
}

describe("RateProvider", () => {
  let provider: RateProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    findValidRateMock.mockResolvedValue(null);
    upsertRateMock.mockResolvedValue(undefined);
    provider = new RateProvider();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devuelve la tasa de Frankfurter y guarda en cache", async () => {
    fetchMock.mockResolvedValue(
      fetchResponse({ json: { rate: 1498.12 } }),
    );

    const rate = await provider.getRate("USD", "ARS");

    expect(rate.provider).toBe("frankfurter");
    expect(rate.rate).toBe(1498.12);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(upsertRateMock).toHaveBeenCalledTimes(1);
  });

  it("usa la cache vigente sin volver a llamar a los proveedores", async () => {
    const cachedAt = new Date();
    findValidRateMock.mockResolvedValue({
      source: "USD",
      target: "ARS",
      rate: 10,
      provider: "frankfurter",
      fetchedAt: cachedAt,
    });

    const rate = await provider.getRate("USD", "ARS");

    expect(rate.rate).toBe(10);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(upsertRateMock).not.toHaveBeenCalled();
  });

  it("hace fallback a ExchangeRate-API si Frankfurter falla", async () => {
    fetchMock
      .mockResolvedValueOnce(
        fetchResponse({ ok: false, status: 500 }),
      )
      .mockResolvedValueOnce(
        fetchResponse({
          json: { result: "success", rates: { ARS: 800 } },
        }),
      );

    const rate = await provider.getRate("USD", "ARS");

    expect(rate.provider).toBe("exchange_rate_api");
    expect(rate.rate).toBe(800);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("lanza RateProviderError si ambos proveedores fallan", async () => {
    fetchMock.mockResolvedValue(
      fetchResponse({ ok: false, status: 503 }),
    );

    await expect(
      provider.getRate("USD", "ARS"),
    ).rejects.toBeInstanceOf(RateProviderError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  describe("getHistoricalRates", () => {
    it("trae el histórico de Frankfurter y guarda cada fecha", async () => {
      fetchMock.mockResolvedValue(
        fetchResponse({
          json: [
            { date: "2026-08-07", base: "USD", quote: "ARS", rate: 1490.5 },
            { date: "2026-08-10", base: "USD", quote: "ARS", rate: 1493.1 },
            { date: "2026-08-11", base: "USD", quote: "ARS", rate: 1495.0 },
          ],
        }),
      );
      upsertDailyQuoteMock.mockResolvedValue(undefined);

      const result = await provider.getHistoricalRates(
        "USD",
        "ARS",
        new Date("2026-08-07T00:00:00.000Z"),
        new Date("2026-08-13T00:00:00.000Z"),
      );

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        date: "2026-08-07",
        source: "USD",
        target: "ARS",
        rate: 1490.5,
        provider: "frankfurter",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(upsertDailyQuoteMock).toHaveBeenCalledTimes(3);

      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain("api.frankfurter.dev/v2/rates");
      expect(url).toContain("base=USD");
      expect(url).toContain("quotes=ARS");
    });

    it("lanza RateProviderError si Frankfurter falla", async () => {
      fetchMock.mockResolvedValue(
        fetchResponse({ ok: false, status: 500 }),
      );

      await expect(
        provider.getHistoricalRates(
          "USD",
          "ARS",
          new Date("2026-08-07T00:00:00.000Z"),
          new Date("2026-08-13T00:00:00.000Z"),
        ),
      ).rejects.toBeInstanceOf(RateProviderError);
      expect(upsertDailyQuoteMock).not.toHaveBeenCalled();
    });
  });
});
