import { pool } from "../../db/pool";
import type {
  ExchangeRate,
  RateProviderName,
} from "./rate-provider";

export interface CachedRateRow {
  rate: string;
  provider: string;
  fetched_at: Date;
}

export async function findValidRate(
  source: string,
  target: string,
  now: Date,
): Promise<ExchangeRate | null> {
  const result = await pool.query<CachedRateRow>(
    `
      SELECT rate, provider, fetched_at
      FROM exchange_rate_cache
      WHERE source_currency = $1
        AND target_currency = $2
        AND expires_at > $3
    `,
    [source, target, now],
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
    fetchedAt: row.fetched_at,
  };
}

export async function upsertRate(
  rate: ExchangeRate,
  expiresAt: Date,
): Promise<void> {
  await pool.query(
    `
      INSERT INTO exchange_rate_cache (
        source_currency,
        target_currency,
        rate,
        provider,
        fetched_at,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (source_currency, target_currency) DO UPDATE SET
        rate = EXCLUDED.rate,
        provider = EXCLUDED.provider,
        fetched_at = EXCLUDED.fetched_at,
        expires_at = EXCLUDED.expires_at,
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      rate.source,
      rate.target,
      String(rate.rate),
      rate.provider,
      rate.fetchedAt,
      expiresAt,
    ],
  );
}
