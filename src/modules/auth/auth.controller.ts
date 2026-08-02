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
    const firebaseUid = req.user!.uid;

    const user = await syncUser(firebaseUid);

    if (user) {
      return res.status(200).json({
        data: user,
      });
    }

    return res.status(404).json({
      message: "El usuario no existe en la base de datos.",
    });
  } catch (error) {
    next(error);
  }
}