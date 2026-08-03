import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/firebase-auth.middleware";
import { BalancesController } from "./balances.controller";

const balancesRouter = Router();
const balancesController = new BalancesController();

/**
 * @openapi
 * /balances:
 *   get:
 *     tags:
 *       - Balances
 *     summary: Consultar los saldos del usuario
 *     description: Devuelve los saldos de la billetera autenticada en ARS, USD y EUR.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Saldos obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balances:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Balance"
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
balancesRouter.get(
  "/",
  verifyFirebaseToken,
  balancesController.getBalances,
);

export { balancesRouter };