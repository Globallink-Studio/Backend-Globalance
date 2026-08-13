import { z } from "zod";

export const CURRENCIES = ["ARS", "USD", "EUR"] as const;

const currencySchema = z.enum(CURRENCIES);

export const ratesQuerySchema = z.object({
  base: z.optional(currencySchema),
});

export const ratesHistoryQuerySchema = z.object({
  source: currencySchema,
  target: currencySchema,
  days: z
    .optional(z.coerce.number().int().min(1).max(90))
    .default(7),
});

export type RatesQuery = z.infer<typeof ratesQuerySchema>;
export type RatesHistoryQuery = z.infer<
  typeof ratesHistoryQuerySchema
>;
export type Currency = (typeof CURRENCIES)[number];
