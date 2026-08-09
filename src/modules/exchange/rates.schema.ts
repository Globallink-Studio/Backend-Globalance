import { z } from "zod";

export const CURRENCIES = ["ARS", "USD", "EUR"] as const;

const currencySchema = z.enum(CURRENCIES);

export const ratesQuerySchema = z.object({
  base: z.optional(currencySchema),
});

export type RatesQuery = z.infer<typeof ratesQuerySchema>;
export type Currency = (typeof CURRENCIES)[number];
