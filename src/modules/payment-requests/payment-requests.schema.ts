import { z } from "zod";

const amountSchema = z
  .string()
  .trim()
  .regex(
    /^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/,
    "El monto debe ser un número decimal válido",
  )
  .refine(
    (value) => Number(value) > 0,
    "El monto debe ser mayor que cero",
  );

export const createPaymentRequestSchema = z
  .object({
    payerEmail: z
      .string()
      .trim()
      .email("El correo del pagador no es válido")
      .max(254)
      .transform((value) => value.toLowerCase()),

    currency: z.enum(["ARS", "USD", "EUR"]),

    amount: amountSchema,
  })
  .strict();

export const paymentRequestIdSchema = z
  .string()
  .uuid("El identificador de la solicitud no es válido");

export const paymentRequestTokenSchema = z
  .string()
  .uuid("El token de pago no es válido");

export const listPaymentRequestsQuerySchema = z
  .object({
    scope: z.enum(["sent", "received"]),

    status: z
      .enum([
        "pending",
        "paid",
        "expired",
        "cancelled",
      ])
      .optional(),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),

    offset: z.coerce
      .number()
      .int()
      .min(0)
      .default(0),
  })
  .strict();

export type CreatePaymentRequestInput = z.infer<typeof createPaymentRequestSchema>;
export type ListPaymentRequestsQuery = z.infer<typeof listPaymentRequestsQuerySchema>;