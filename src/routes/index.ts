import { Router } from "express";
import healthRoutes from "../modules/health/health.routes";
import authRoutes from "../modules/auth/auth.routes";
import { walletRouter } from "../modules/wallets/wallet.routes";
import { balancesRouter } from "../modules/balances/balances.routes";
import { usersRouter } from "../modules/users/users.routes";
import { transactionsRouter } from "../modules/transactions/transactions.routes";
import { exchangeRouter } from "../modules/exchange/exchange.routes";
import { paymentRequestsRouter } from "../modules/payment-requests/payment-requests.routes";
import { aiRouter } from "../modules/ai/ai.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/wallet", walletRouter);
router.use("/balances", balancesRouter);
router.use("/users", usersRouter);
router.use("/transactions", transactionsRouter);
router.use("/exchange", exchangeRouter);
router.use("/payment-requests", paymentRequestsRouter);
router.use("/ai", aiRouter);

export default router;
