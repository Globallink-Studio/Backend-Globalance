import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";

type PostgresError = {
  code?: string;
  constraint?: string;
};

function isPostgresError(error: unknown): error is PostgresError {
  return typeof error === "object" && error !== null && "code" in error;
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error(error);

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  if (isPostgresError(error)) {
    if (error.code === "23505") {
      const messages: Record<string, string> = {
        users_email_key: "Ya existe un usuario con este correo.",
        users_firebase_uid_key: "Este usuario ya está registrado.",
        wallets_alias_key: "Este alias ya está en uso.",
        wallets_account_number_key:
          "Este número de cuenta ya está en uso.",
        person_profiles_document_key:
          "Este documento ya está registrado.",
        company_profiles_document_key:
          "Este documento ya está registrado.",
      };

      return res.status(409).json({
        error: {
          code: "DUPLICATE_RESOURCE",
          message:
            messages[error.constraint ?? ""] ??
            "Ya existe un registro con estos datos.",
        },
      });
    }

    if (error.code === "23503") {
      return res.status(400).json({
        error: {
          code: "INVALID_REFERENCE",
          message: "La operación hace referencia a un recurso inválido.",
        },
      });
    }

    if (error.code === "23514") {
      return res.status(400).json({
        error: {
          code: "BUSINESS_RULE_VIOLATION",
          message: "La operación no cumple las reglas de negocio.",
        },
      });
    }

    if (error.code === "22P02") {
      return res.status(400).json({
        error: {
          code: "INVALID_FORMAT",
          message: "Uno o más datos tienen un formato inválido.",
        },
      });
    }
  }

  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Ocurrió un error interno.",
    },
  });
}