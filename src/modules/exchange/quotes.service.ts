import { RateProvider } from "./rate-provider";

const QUOTE_EXPIRATION_MS = 60_000;

function formatDecimal(value: number, decimalPlaces: number): string {
  return value.toFixed(decimalPlaces);
}

export interface QuoteResult {
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: string;
  targetAmount: string;
  rate: string;
  provider: string;
  fetchedAt: Date;
  expiresAt: Date;
}

export class QuotesService {
  constructor(
    private readonly rateProvider = new RateProvider(),
  ) {}

  async getQuote(
    source: string,
    target: string,
    amount = "1",
  ): Promise<QuoteResult> {
    const exchangeRate = await this.rateProvider.getRate(
      source,
      target,
    );

    const sourceAmount = Number(amount);
    const targetAmount =
      Math.round(sourceAmount * exchangeRate.rate * 1e8) / 1e8;

    const expiresAt = new Date(
      exchangeRate.fetchedAt.getTime() + QUOTE_EXPIRATION_MS,
    );

    return {
      sourceCurrency: source,
      targetCurrency: target,
      sourceAmount: formatDecimal(sourceAmount, 8),
      targetAmount: formatDecimal(targetAmount, 8),
      rate: formatDecimal(exchangeRate.rate, 10),
      provider: exchangeRate.provider,
      fetchedAt: exchangeRate.fetchedAt,
      expiresAt,
    };
  }
}
