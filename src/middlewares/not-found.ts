import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";

export function notFound(
  _req: Request,
  _res: Response,
  next: NextFunction,
) {
  next(
    new AppError(
      404,
      "NOT_FOUND",
      "La ruta solicitada no existe.",
    ),
  );
}