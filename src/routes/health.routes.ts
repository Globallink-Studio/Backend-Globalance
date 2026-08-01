import { Router } from "express";
import { pool } from "../db/pool";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res, next) => {
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
});