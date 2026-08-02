import { Router } from "express";
import healthRoutes from "../modules/health/health.routes";
import authRoutes from "../modules/auth/auth.routes";
import { walletRouter } from "../modules/wallets/wallet.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/wallet", walletRouter);

export default router;