import { Router } from "express";
import {
  getCurrentUser,
  syncCurrentUser,
} from "./auth.controller";
import { verifyFirebaseToken } from "../../middlewares/firebase-auth.middleware";

const router = Router();

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Obtener el usuario autenticado de Firebase
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuario autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/FirebaseUser"
 *       401:
 *         description: Token ausente, inválido o vencido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
router.get("/me", verifyFirebaseToken, getCurrentUser);

/**
 * @openapi
 * /auth/sync:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Sincronizar el usuario de Firebase con PostgreSQL
 *     description: Crea el usuario, su billetera y sus balances iniciales si todavía no existen.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuario sincronizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   oneOf:
 *                     - $ref: "#/components/schemas/User"
 *                     - type: object
 *                       properties:
 *                         user:
 *                           $ref: "#/components/schemas/User"
 *                         wallet:
 *                           $ref: "#/components/schemas/Wallet"
 *       400:
 *         description: El usuario autenticado no contiene un correo electrónico
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       401:
 *         description: Usuario no autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
router.post("/sync", verifyFirebaseToken, syncCurrentUser);

export default router;