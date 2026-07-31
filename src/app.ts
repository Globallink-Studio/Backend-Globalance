import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.routes";

export const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRouter);

app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Ocurrió un error interno",
      },
    });
  },
);