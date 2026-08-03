import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/firebase-auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import {
  readProfile,
  updateProfile,
} from "./users.controller";
import { completeProfileSchema } from "./users.schema";

export const usersRouter = Router();

/**
 * @openapi
 * /users/profile:
 *   get:
 *     tags:
 *       - Users
 *     summary: Consultar el perfil del usuario
 *     description: Devuelve el perfil personal o empresarial del usuario autenticado.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/UserProfile"
 *       401:
 *         description: Token ausente, inválido o vencido
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
usersRouter.get(
  "/profile",
  verifyFirebaseToken,
  readProfile,
);

/**
 * @openapi
 * /users/profile:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Completar el perfil del usuario
 *     description: Define si la cuenta es personal o empresarial y registra sus datos.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: "#/components/schemas/PersonProfileInput"
 *               - $ref: "#/components/schemas/CompanyProfileInput"
 *     responses:
 *       200:
 *         description: Perfil completado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Perfil completado correctamente.
 *       400:
 *         description: Datos del perfil inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       401:
 *         description: Token ausente, inválido o vencido
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
usersRouter.patch(
  "/profile",
  verifyFirebaseToken,
  validateBody(completeProfileSchema),
  updateProfile,
);
