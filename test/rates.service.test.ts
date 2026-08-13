import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/modules/exchange/rate-provider", () => ({
  RateProvider: vi.fn(),
  RateProviderError: class RateProviderError extends Error {},
}));

vi.mock("../src/modules/exchange/quote-history.repository", () => ({
  findQuoteHistory: vi.fn(),
}));

import { RateProvider } from "../src/modules/exchange/rate-provider";
import { RatesService } from "../src/modules/exchange/rates.service";
import { findQuoteHistory } from "../src/modules/exchange/quote-history.repository";

const getRateMock = vi.fn();
const getHistoricalRatesMock = vi.fn();
const findQuoteHistoryMock = vi.mocked(findQuoteHistory);

function mockProvider(): RateProvider {
  return {
    getRate: getRateMock,
    getHistoricalRates: getHistoricalRatesMock,
  } as unknown as RateProvider;
}

describe("RatesService", () => {
  let service: RatesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RatesService(mockProvider());
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

describe("RatesService.getRatesHistory", () => {
  let service: RatesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RatesService(mockProvider());
  });

  it("devuelve el historial del par para la cantidad de días pedida", async () => {
    findQuoteHistoryMock.mockResolvedValue([
      {
        quote_date: "2026-08-10",
        rate: "1498.1200000000",
        provider: "frankfurter",
      },
      {
        quote_date: "2026-08-11",
        rate: "1500.0000000000",
        provider: "frankfurter",
      },
    ]);

    const result = await service.getRatesHistory("USD", "ARS", 7);

    expect(result).toEqual({
      source: "USD",
      target: "ARS",
      days: 7,
      history: [
        {
          date: "2026-08-10",
          rate: "1498.1200000000",
          provider: "frankfurter",
        },
        {
          date: "2026-08-11",
          rate: "1500.0000000000",
          provider: "frankfurter",
        },
      ],
    });
  });

  it("usa 7 días por defecto cuando no se especifica", async () => {
    findQuoteHistoryMock.mockResolvedValue([]);

    const result = await service.getRatesHistory("ARS", "USD");

    expect(result.days).toBe(7);
    expect(result.history).toEqual([]);
  });

  it("completa las fechas faltantes consultando el histórico y re-lee", async () => {
    findQuoteHistoryMock.mockResolvedValue([]);
    getHistoricalRatesMock.mockResolvedValue([
      {
        date: "2026-08-07",
        source: "USD",
        target: "ARS",
        rate: 1490.5,
        provider: "frankfurter",
      },
    ]);

    await service.getRatesHistory("USD", "ARS", 7);

    expect(getHistoricalRatesMock).toHaveBeenCalledTimes(1);
    expect(findQuoteHistoryMock).toHaveBeenCalledTimes(2);
  });

  it("sigue funcionando si el histórico falla", async () => {
    findQuoteHistoryMock.mockResolvedValue([]);
    getHistoricalRatesMock.mockRejectedValue(new Error("offline"));

    const result = await service.getRatesHistory("USD", "ARS", 7);

    expect(getHistoricalRatesMock).toHaveBeenCalledTimes(1);
    expect(result.history).toEqual([]);
  });

  it("rechaza con 400 una moneda no soportada", async () => {
    await expect(
      service.getRatesHistory("GBP", "USD", 7),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "VALIDATION_ERROR",
    });
    expect(findQuoteHistoryMock).not.toHaveBeenCalled();
  });

  it("rechaza con 400 cuando origen y destino son iguales", async () => {
    await expect(
      service.getRatesHistory("USD", "USD", 7),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "VALIDATION_ERROR",
    });
    expect(findQuoteHistoryMock).not.toHaveBeenCalled();
  });
});
