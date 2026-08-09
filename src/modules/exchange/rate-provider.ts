import { env } from "../../config/env";

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

export class RateProvider {
  async getRate(
    source: string,
    target: string,
  ): Promise<ExchangeRate> {
    try {
      return await this.fetchFrankfurter(source, target);
    } catch {
      try {
        return await this.fetchExchangeRateApi(source, target);
      } catch {
        throw new RateProviderError(
          `No se pudieron obtener las tasas de cambio (${source} → ${target}) de los proveedores disponibles`,
        );
      }
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
