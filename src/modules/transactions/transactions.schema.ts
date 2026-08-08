import { z } from "zod";
import { DEMO_FUNDING_LIMITS } from "../../config/demo-funding";

const amountSchema = z
  .string()
  .trim()
  .regex(
    /^\d+(?:\.\d{1,8})?$/,
    "El monto debe ser un número decimal con hasta 8 decimales",
  )
  .refine((amount) => Number(amount) > 0, {
    message: "El monto debe ser mayor que cero",
  });

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
