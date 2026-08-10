import { z } from "zod";

export const assistantMessageSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, "El mensaje no puede estar vacío")
      .max(1000, "El mensaje no puede superar los 1000 caracteres"),
  })
  .strict();

export type AssistantMessageInput = z.infer<typeof assistantMessageSchema>;
