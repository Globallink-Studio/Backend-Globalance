import { Request, Response, NextFunction } from "express";
import { pool } from "../../db/pool";

export async function getHealth(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await pool.query("SELECT NOW() AS now");

    res.status(200).json({
      data: {
        status: "ok",
        database: "connected",
        timestamp: result.rows[0].now,
      },
    });
  } catch (error) {
    next(error);
  }
}