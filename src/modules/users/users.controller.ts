import { NextFunction, Request, Response } from "express";
import {
  completeProfile,
  CompleteProfileParams,
  editProfile,
  EditProfileParams,
  getProfile,
} from "./users.service";

export async function completeProfileHandler(
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

export async function editProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const changes = req.body as EditProfileParams;

    const result = await editProfile(
      req.user!.uid,
      changes,
    );

    return res.status(200).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function readProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const profile = await getProfile(req.user!.uid);

    return res.status(200).json({
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}
