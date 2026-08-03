import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";

export function validateBody(schema: ZodType) {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Los datos enviados no son válidos",
          details: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
