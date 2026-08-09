import { Router } from "express";
import { quotesRouter } from "./quotes.routes";
import { ratesRouter } from "./rates.routes";

const exchangeRouter = Router();

exchangeRouter.use(quotesRouter);
exchangeRouter.use(ratesRouter);

export { exchangeRouter };
