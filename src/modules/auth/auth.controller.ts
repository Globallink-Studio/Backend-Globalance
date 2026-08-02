import { Request, Response, NextFunction } from "express";
import { syncUser } from "./auth.service";

export function getCurrentUser(req: Request, res: Response) {
  res.status(200).json({
    data: req.user,
  });
}

export async function syncCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Usuario no autenticado.",
        },
      });
    }

    if (!req.user.email) {
      return res.status(400).json({
        error: {
          code: "EMAIL_REQUIRED",
          message: "El usuario autenticado no tiene un correo electrónico.",
        },
      });
    }

    const user = await syncUser(req.user);

    return res.status(200).json({
      data: user,
    });
  } catch (error) {
    next(error);
  }
}
