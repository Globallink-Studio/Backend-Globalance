import { z } from "zod";
import { DEMO_FUNDING_LIMITS } from "../../config/demo-funding";

export const amountSchema = z
  .string()
  .trim()
  .regex(
    /^\d+(?:\.\d{1,8})?$/,
    "El monto debe ser un número decimal con hasta 8 decimales",
  )
  .refine((amount) => Number(amount) > 0, {
    message: "El monto debe ser mayor que cero",
  });

const currencySchema = z.enum(["ARS", "USD", "EUR"]);

export const exchangeSchema = z
  .object({
    sourceCurrency: currencySchema,
    targetCurrency: currencySchema,
    sourceAmount: amountSchema,
  })
  .superRefine(({ sourceCurrency, targetCurrency }, context) => {
    if (sourceCurrency === targetCurrency) {
      context.addIssue({
        code: "custom",
        path: ["targetCurrency"],
        message:
          "La moneda de destino debe ser distinta de la de origen",
      });
    }
  });

export type ExchangeInput = z.infer<typeof exchangeSchema>;

export const demoFundingSchema = z
  .object({
    currency: z.enum(["ARS", "USD", "EUR"]),
    amount: amountSchema,
  })
  .superRefine(({ currency, amount }, context) => {
    const maximumAmount = DEMO_FUNDING_LIMITS[currency];

    if (Number(amount) > Number(maximumAmount)) {
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: `El monto máximo para ${currency} es ${maximumAmount}`,
      });
    }
  });

export type DemoFundingInput = z.infer<typeof demoFundingSchema>;
