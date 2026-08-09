import { z } from "zod";

const aliasSchema = z
  .string()
  .trim()
  .min(6, "El alias debe tener al menos 6 caracteres")
  .max(30, "El alias no puede superar los 30 caracteres")
  .regex(
    /^[a-z0-9.-]+$/,
    "El alias solo puede contener minúsculas, números, puntos y guiones",
  );

const documentSchema = z
  .string()
  .trim()
  .min(5, "El documento debe tener al menos 5 caracteres")
  .max(30, "El documento no puede superar los 30 caracteres");

const phoneSchema = z
  .string()
  .trim()
  .min(7, "El teléfono debe tener al menos 7 caracteres")
  .max(30, "El teléfono no puede superar los 30 caracteres")
  .regex(
    /^\+?[0-9\s()-]+$/,
    "El formato del teléfono no es válido",
  );

const displayCurrencySchema = z.enum(["ARS", "USD", "EUR"]);

const timezoneSchema = z
  .string()
  .trim()
  .min(1, "La zona horaria es obligatoria")
  .max(64, "La zona horaria no puede superar los 64 caracteres")
  .refine(
    (timezone) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
        return true;
      } catch {
        return false;
      }
    },
    { message: "La zona horaria no es válida" },
  );

const personProfileSchema = z
  .object({
    userType: z.literal("person"),
    firstName: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(100, "El nombre no puede superar los 100 caracteres"),
    lastName: z
      .string()
      .trim()
      .min(2, "El apellido debe tener al menos 2 caracteres")
      .max(100, "El apellido no puede superar los 100 caracteres"),
    document: documentSchema,
    phone: phoneSchema,
    alias: aliasSchema,
    displayCurrency: displayCurrencySchema,
    timezone: timezoneSchema.optional(),
  })
  .strict();

const companyProfileSchema = z
  .object({
    userType: z.literal("company"),
    legalName: z
      .string()
      .trim()
      .min(2, "La razón social debe tener al menos 2 caracteres")
      .max(150, "La razón social no puede superar los 150 caracteres"),
    document: documentSchema,
    phone: phoneSchema,
    alias: aliasSchema,
    displayCurrency: displayCurrencySchema,
    timezone: timezoneSchema.optional(),
  })
  .strict();

export const completeProfileSchema = z.discriminatedUnion(
  "userType",
  [
    personProfileSchema,
    companyProfileSchema,
  ],
);

export type CompleteProfileInput =
  z.infer<typeof completeProfileSchema>;