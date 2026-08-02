import { Router } from "express";
import healthRoutes from "../modules/health/health.routes";
import authRoutes from "../modules/auth/auth.routes";
import { walletRouter } from "../modules/wallets/wallet.routes";
import { usersRouter } from "../modules/users/users.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/wallet", walletRouter);
router.use("/users", usersRouter);

export default router;