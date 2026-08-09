import { AppError } from "../../errors/app-error";
import { RateProvider } from "./rate-provider";
import { CURRENCIES, Currency } from "./rates.schema";

const RATES_VALIDITY_MS = 60_000;

export interface RatesResult {
  base: Currency;
  rates: Record<Currency, string>;
  provider: string;
  fetchedAt: Date;
  expiresAt: Date;
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
}
