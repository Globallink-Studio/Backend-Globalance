import { NextFunction, Request, Response } from "express";
import { auth } from "../config/firebase";

export async function verifyFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Token no proporcionado.",
        },
      });
    }

    const token = authorization.split(" ")[1];

    const decodedToken = await auth.verifyIdToken(token);

    req.user = decodedToken;

    next();
  } catch {
    return res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Token inválido.",
      },
    });
  }
}