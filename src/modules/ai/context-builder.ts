import { pool } from "../../db/pool";
import { AppError } from "../../errors/app-error";
import { findUserByFirebaseUid } from "../auth/auth.repository";
import { BalanceRepository } from "../balances/balances.repository";
import { TransactionsRepository } from "../transactions/transactions.repository";
import { WalletRepository } from "../wallets/wallet.repository";

export interface AssistantBalance {
  currency: string;
  amount: string;
}

export interface AssistantMovement {
  type: string;
  description: string | null;
  created_at: Date;
  detail: string[];
}

export interface AssistantContext {
  user: {
    email: string;
    display_currency: string;
  };
  balances: AssistantBalance[];
  movements: AssistantMovement[];
}

const RECENT_MOVEMENTS_LIMIT = 10;

export class ContextBuilder {
  constructor(
    private readonly walletRepository = new WalletRepository(),
    private readonly balanceRepository = new BalanceRepository(),
    private readonly transactionsRepository =
      new TransactionsRepository(),
  ) {}

  async build(firebaseUid: string): Promise<AssistantContext> {
    const client = await pool.connect();

    try {
      const user = await findUserByFirebaseUid(client, firebaseUid);

      if (!user) {
        throw new AppError(
          404,
          "USER_NOT_FOUND",
          "Usuario no encontrado.",
        );
      }

      const wallet = await this.walletRepository.findByUserId(
        user.id,
      );

      if (!wallet) {
        throw new AppError(
          404,
          "WALLET_NOT_FOUND",
          "Billetera no encontrada.",
        );
      }

      const balances =
        await this.balanceRepository.findByWalletId(wallet.id);

      const history =
        await this.transactionsRepository.findHistoryByWalletId(
          client,
          wallet.id,
          null,
          null,
          RECENT_MOVEMENTS_LIMIT,
          0,
        );

      return {
        user: {
          email: user.email,
          display_currency: user.display_currency,
        },
        balances: balances.map((balance) => ({
          currency: balance.currency_code,
          amount: balance.amount,
        })),
        movements: history.map((transaction) => ({
          type: transaction.type,
          description: transaction.description,
          created_at: transaction.created_at,
          detail: transaction.movements.map(
            (movement) =>
              `${movement.direction === "credit" ? "+" : "-"}` +
              `${movement.amount} ${movement.currency}`,
          ),
        })),
      };
    } finally {
      client.release();
    }
  }
}

export function buildPrompt(
  context: AssistantContext,
  message: string,
): string {
  const balancesText = context.balances.length
    ? context.balances
        .map((balance) => `- ${balance.amount} ${balance.currency}`)
        .join("\n")
    : "- Sin saldos registrados";

  const movementsText = context.movements.length
    ? context.movements
        .map((movement) => {
          const date = movement.created_at
            .toISOString()
            .slice(0, 10);
          const detail = movement.detail.length
            ? ` (${movement.detail.join(", ")})`
            : "";
          return (
            `- ${date} [${movement.type}] ` +
            `${movement.description ?? "sin descripción"}${detail}`
          );
        })
        .join("\n")
    : "- Sin movimientos recientes";

  return [
    "Eres el asistente financiero de Globalance, una billetera digital multi-moneda.",
    "Responde consultas sobre saldos, movimientos y operaciones usando SOLO los datos provistos.",
    "Si te preguntan algo que no puedes responder con el contexto, dilo claramente.",
    "Usa el formato de moneda correcto (ARS, USD, EUR) y responde en español.",
    "",
    "CONTEXTO DEL USUARIO:",
    `- Usuario: ${context.user.email}`,
    `- Moneda principal: ${context.user.display_currency}`,
    "",
    "SALDOS:",
    balancesText,
    "",
    "MOVIMIENTOS RECIENTES:",
    movementsText,
    "",
    "CONSULTA DEL USUARIO:",
    message,
  ].join("\n");
}
