import { Router } from "express";
import healthRoutes from "../modules/health/health.routes";
import authRoutes from "../modules/auth/auth.routes";
import { walletRouter } from "../modules/wallets/wallet.routes";
import { balancesRouter } from "../modules/balances/balances.routes";
import { usersRouter } from "../modules/users/users.routes";
import { transactionsRouter } from "../modules/transactions/transactions.routes";
import { quotesRouter } from "../modules/exchange/quotes.routes";
import { ratesRouter } from "../modules/exchange/rates.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/wallet", walletRouter);
router.use("/balances", balancesRouter);
router.use("/users", usersRouter);
router.use("/transactions", transactionsRouter);
router.use("/exchange", quotesRouter);
router.use("/exchange", ratesRouter);

export default router;
