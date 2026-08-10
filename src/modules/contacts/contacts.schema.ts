import { z } from "zod";

const contactNameSchema = z
  .string()
  .trim()
  .min(1, "El apodo no puede estar vacío")
  .max(50, "El apodo no puede superar los 50 caracteres");

const aliasSchema = z
  .string()
  .trim()
  .min(6, "El alias debe tener al menos 6 caracteres")
  .max(30, "El alias no puede superar los 30 caracteres")
  .regex(
    /^[a-z0-9.-]+$/,
    "El alias tiene un formato inválido",
  );

const accountNumberSchema = z
  .string()
  .trim()
  .regex(
    /^GLB-[0-9A-F]{8}$/,
    "El número de cuenta tiene un formato inválido",
  );

export const createContactSchema = z.discriminatedUnion(
  "type",
  [
    z
      .object({
        name: contactNameSchema,
        type: z.literal("alias"),
        value: aliasSchema,
      })
      .strict(),
    z
      .object({
        name: contactNameSchema,
        type: z.literal("account_number"),
        value: accountNumberSchema,
      })
      .strict(),
  ],
);

export type CreateContactInput = z.infer<typeof createContactSchema>;

export const contactIdSchema = z.uuid(
  "El identificador del contacto no es válido",
);
