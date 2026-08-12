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

const aliasSchema = z
  .string()
  .trim()
  .min(6, "El alias debe tener al menos 6 caracteres")
  .max(30, "El alias no puede superar los 30 caracteres")
  .regex(/^[a-z0-9.-]+$/, "El alias tiene un formato inválido");

const accountNumberSchema = z
  .string()
  .trim()
  .regex(/^GLB-[0-9A-F]{8}$/, "El número de cuenta tiene un formato inválido");

export const createPaymentRequestSchema = z
  .object({
    payerEmail: z
      .string()
      .trim()
      .email("El correo del pagador no es válido")
      .max(254)
      .transform((value) => value.toLowerCase())
      .optional(),
    payerAlias: aliasSchema.optional(),
    payerAccountNumber: accountNumberSchema.optional(),
    currency: z.enum(["ARS", "USD", "EUR"]),
    amount: amountSchema,
  })
  .strict()
  .refine(
    (data) =>
      data.payerEmail !== undefined ||
      data.payerAlias !== undefined ||
      data.payerAccountNumber !== undefined,
    {
      message: "Se debe proporcionar al menos uno de los siguientes campos: payerEmail, payerAlias o payerAccountNumber",
      path: ["payerEmail"],
    }
  );


export const paymentRequestIdSchema = z.uuid(
  "El identificador de la solicitud no es válido",
);

export const paymentRequestTokenSchema = z.uuid(
  "El token de pago no es válido",
);

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