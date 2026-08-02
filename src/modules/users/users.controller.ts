import { NextFunction, Request, Response } from "express";
import {
  completeProfile,
  CompleteProfileParams,
} from "./users.service";

export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const profile = req.body as CompleteProfileParams;

    const result = await completeProfile(
      req.user!.uid,
      profile,
    );

    return res.status(200).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
}