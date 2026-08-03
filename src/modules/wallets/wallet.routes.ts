import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/firebase-auth.middleware";
import { WalletController } from "./wallet.controller";

const walletRouter = Router();
const walletController = new WalletController();

/**
 * @openapi
 * /wallet:
 *   get:
 *     tags:
 *       - Wallet
 *     summary: Consultar la billetera del usuario
 *     description: Devuelve los datos del usuario, su billetera y los saldos disponibles en ARS, USD y EUR.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Billetera obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/WalletSummary"
 *       401:
 *         description: Token ausente, inválido o vencido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         description: Usuario o billetera no encontrados, o error interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
walletRouter.get(
  "/",
  verifyFirebaseToken,
  walletController.getWallet,
);

export { walletRouter };
