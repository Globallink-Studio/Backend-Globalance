import { pool } from "../../db/pool";
import type {
  ExchangeRate,
  RateProviderName,
} from "./rate-provider";

export interface QuoteHistoryRow {
  rate: string;
  provider: string;
}

export async function upsertDailyQuote(
  rate: ExchangeRate,
  quoteDate: Date,
): Promise<void> {
  await pool.query(
    `
      INSERT INTO exchange_quote_history (
        source_currency,
        target_currency,
        quote_date,
        rate,
        provider
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (source_currency, target_currency, quote_date)
      DO UPDATE SET
        rate = EXCLUDED.rate,
        provider = EXCLUDED.provider,
        fetched_at = CURRENT_TIMESTAMP
    `,
    [
      rate.source,
      rate.target,
      quoteDate.toISOString().slice(0, 10),
      String(rate.rate),
      rate.provider,
    ],
  );
}

export async function findQuoteOnDate(
  source: string,
  target: string,
  date: Date,
): Promise<ExchangeRate | null> {
  const result = await pool.query<QuoteHistoryRow>(
    `
      SELECT rate, provider
      FROM exchange_quote_history
      WHERE source_currency = $1
        AND target_currency = $2
        AND quote_date = $3
    `,
    [source, target, date.toISOString().slice(0, 10)],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    source,
    target,
    rate: Number(row.rate),
    provider: row.provider as RateProviderName,
    fetchedAt: date,
  };
}
