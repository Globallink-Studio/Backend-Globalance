import { env } from "../../config/env";
import { findValidRate, upsertRate } from "./rate-cache.repository";
import { upsertDailyQuote } from "./quote-history.repository";

export type RateProviderName = "frankfurter" | "exchange_rate_api";

export interface ExchangeRate {
  source: string;
  target: string;
  rate: number;
  provider: RateProviderName;
  fetchedAt: Date;
}

export class RateProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateProviderError";
  }
}

const REQUEST_TIMEOUT_MS = 5000;
const PRIMARY_TTL_MS = 60 * 60 * 1000;
const FALLBACK_TTL_MS = 12 * 60 * 60 * 1000;

export class RateProvider {
  async getRate(
    source: string,
    target: string,
  ): Promise<ExchangeRate> {
    const cached = await this.readCache(source, target);

    if (cached) {
      return cached;
    }

    try {
      const rate = await this.fetchFrankfurter(source, target);
      await this.storeCache(rate);
      await this.storeDailyQuote(rate);
      return rate;
    } catch {
      try {
        const rate = await this.fetchExchangeRateApi(source, target);
        await this.storeCache(rate);
        await this.storeDailyQuote(rate);
        return rate;
      } catch {
        throw new RateProviderError(
          `No se pudieron obtener las tasas de cambio (${source} → ${target}) de los proveedores disponibles`,
        );
      }
    }
  }

  private async readCache(
    source: string,
    target: string,
  ): Promise<ExchangeRate | null> {
    try {
      return await findValidRate(source, target, new Date());
    } catch {
      return null;
    }
  }

  private async storeCache(rate: ExchangeRate): Promise<void> {
    const ttlMs =
      rate.provider === "frankfurter"
        ? PRIMARY_TTL_MS
        : FALLBACK_TTL_MS;

    const expiresAt = new Date(
      rate.fetchedAt.getTime() + ttlMs,
    );

    try {
      await upsertRate(rate, expiresAt);
    } catch {
      // La cache es un refuerzo: si falla, la tasa en vivo igual se devuelve.
    }
  }

  private async storeDailyQuote(rate: ExchangeRate): Promise<void> {
    try {
      await upsertDailyQuote(rate, new Date());
    } catch {
      // El historial es un refuerzo: si falla, la tasa en vivo igual se devuelve.
    }
  }

  private async fetchFrankfurter(
    source: string,
    target: string,
  ): Promise<ExchangeRate> {
    const url =
      `https://api.frankfurter.dev/v2/rate/${source}/${target}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(
        `Frankfurter respondió con status ${response.status}`,
      );
    }

    const data = (await response.json()) as {
      rate?: number;
    };

    const rate = data.rate;

    if (
      typeof rate !== "number" ||
      !Number.isFinite(rate) ||
      rate <= 0
    ) {
      throw new Error(
        `Frankfurter no devolvió tasa para ${source} → ${target}`,
      );
    }

    return {
      source,
      target,
      rate,
      provider: "frankfurter",
      fetchedAt: new Date(),
    };
  }

  private async fetchExchangeRateApi(
    source: string,
    target: string,
  ): Promise<ExchangeRate> {
    const endpoint = env.EXCHANGE_RATE_API_KEY
      ? `https://v6.exchangerate-api.com/v6/${env.EXCHANGE_RATE_API_KEY}/latest/${source}`
      : `https://open.er-api.com/v6/latest/${source}`;

    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(
        `ExchangeRate-API respondió con status ${response.status}`,
      );
    }

    const data = (await response.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };

    if (data.result !== "success") {
      throw new Error(
        "ExchangeRate-API no devolvió una respuesta exitosa",
      );
    }

    const rate = data.rates?.[target];

    if (
      typeof rate !== "number" ||
      !Number.isFinite(rate) ||
      rate <= 0
    ) {
      throw new Error(
        `ExchangeRate-API no devolvió tasa para ${source} → ${target}`,
      );
    }

    return {
      source,
      target,
      rate,
      provider: "exchange_rate_api",
      fetchedAt: new Date(),
    };
  }
}
