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

  const transferBaseFields = {
  currency: z.enum(["ARS", "USD", "EUR"]),
  amount: amountSchema,
};

export const internalTransferSchema = z.discriminatedUnion(
  "destinationType",
  [
    z
      .object({
        ...transferBaseFields,
        destinationType: z.literal("alias"),
        destinationValue: z
          .string()
          .trim()
          .min(6, "El alias debe tener al menos 6 caracteres")
          .max(30, "El alias no puede superar los 30 caracteres")
          .regex(
            /^[a-z0-9.-]+$/,
            "El alias tiene un formato inválido",
          ),
      })
      .strict(),
    z
      .object({
        ...transferBaseFields,
        destinationType: z.literal("accountNumber"),
        destinationValue: z
          .string()
          .trim()
          .regex(
            /^GLB-[0-9A-F]{8}$/,
            "El número de cuenta tiene un formato inválido",
          ),
      })
      .strict(),
  ],
);

export type DemoFundingInput = z.infer<typeof demoFundingSchema>;
export type InternalTransferInput = z.infer<typeof internalTransferSchema>;