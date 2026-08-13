import { AppError } from "../../errors/app-error";
import { RateProvider } from "./rate-provider";
import { CURRENCIES, Currency } from "./rates.schema";
import { findQuoteHistory } from "./quote-history.repository";

const RATES_VALIDITY_MS = 60_000;

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function expectedQuoteDates(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - i);
    date.setUTCHours(0, 0, 0, 0);

    if (!isWeekend(date)) {
      dates.push(date.toISOString().slice(0, 10));
    }
  }

  return dates;
}

export interface RatesResult {
  base: Currency;
  rates: Record<Currency, string>;
  provider: string;
  fetchedAt: Date;
  expiresAt: Date;
}

export interface RatesHistoryResult {
  source: Currency;
  target: Currency;
  days: number;
  history: Array<{
    date: string;
    rate: string;
    provider: string;
  }>;
}

export class RatesService {
  constructor(
    private readonly rateProvider = new RateProvider(),
  ) {}

  async getRates(base: string): Promise<RatesResult> {
    if (!CURRENCIES.includes(base as Currency)) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "La moneda base no es válida.",
      );
    }

    const validatedBase = base as Currency;

    const targets = CURRENCIES.filter(
      (currency) => currency !== validatedBase,
    );

    const pairs = await Promise.all(
      targets.map((target) =>
        this.rateProvider.getRate(validatedBase, target),
      ),
    );

    const rates = {} as Record<Currency, string>;
    let fetchedAt = pairs[0].fetchedAt;
    let provider = pairs[0].provider;

    for (const pair of pairs) {
      rates[pair.target as Currency] = pair.rate.toFixed(10);

      if (pair.fetchedAt > fetchedAt) {
        fetchedAt = pair.fetchedAt;
        provider = pair.provider;
      }
    }

    return {
      base: validatedBase,
      rates,
      provider,
      fetchedAt,
      expiresAt: new Date(fetchedAt.getTime() + RATES_VALIDITY_MS),
    };
  }

  async getRatesHistory(
    source: string,
    target: string,
    days = 7,
  ): Promise<RatesHistoryResult> {
    if (!CURRENCIES.includes(source as Currency)) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "La moneda base no es válida.",
      );
    }

    if (!CURRENCIES.includes(target as Currency)) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "La moneda de destino no es válida.",
      );
    }

    if (source === target) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "La moneda de destino debe ser distinta de la de origen.",
      );
    }

    const existingHistory = await findQuoteHistory(
      source,
      target,
      days,
    );

    const existingDates = new Set(
      existingHistory.map((row) => row.quote_date),
    );

    const expectedDates = expectedQuoteDates(days);
    const missingDates = expectedDates.filter(
      (date) => !existingDates.has(date),
    );

    if (missingDates.length > 0) {
      const fromDate = new Date(
        `${expectedDates[0]}T00:00:00.000Z`,
      );
      const toDate = new Date();
      toDate.setUTCHours(0, 0, 0, 0);

      try {
        await this.rateProvider.getHistoricalRates(
          source,
          target,
          fromDate,
          toDate,
        );
      } catch {
        // Si el proveedor histórico falla, se devuelve lo que haya.
      }
    }

    const historyRows = await findQuoteHistory(
      source,
      target,
      days,
    );

    const history = historyRows.map((row) => ({
      date: row.quote_date,
      rate: row.rate,
      provider: row.provider,
    }));

    return {
      source: source as Currency,
      target: target as Currency,
      days,
      history,
    };
  }
}
