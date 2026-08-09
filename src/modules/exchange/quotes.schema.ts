import { z } from "zod";
import { amountSchema } from "../transactions/transactions.schema";

const currencySchema = z.enum(["ARS", "USD", "EUR"]);

export const quotesQuerySchema = z
  .object({
    source: currencySchema,
    target: currencySchema,
    amount: z.optional(amountSchema),
  })
  .superRefine(({ source, target }, context) => {
    if (source === target) {
      context.addIssue({
        code: "custom",
        path: ["target"],
        message:
          "La moneda de destino debe ser distinta de la de origen",
      });
    }
  });

export type QuotesQuery = z.infer<typeof quotesQuerySchema>;
