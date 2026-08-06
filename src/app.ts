import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import routes from "./routes";
import { swaggerSpec } from "./config/swagger";
import { errorHandler } from "./middlewares/error.middleware";
import { env } from "./config/env";
import { notFound } from "./middlewares/not-found";

export const app = express();

app.use(
  cors({
    origin: [env.FRONTEND_URL, "http://localhost:5173"],
  }),
);
app.use(express.json());

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/api/docs.json", (_req, res) => {
  res.json(swaggerSpec);
});

app.use("/api", routes);

app.use(notFound);

app.use(errorHandler);
