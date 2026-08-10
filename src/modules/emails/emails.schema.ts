import { z } from "zod";

export const emailDeliveryIdSchema = z.uuid(
  "El identificador del correo no es válido",
);