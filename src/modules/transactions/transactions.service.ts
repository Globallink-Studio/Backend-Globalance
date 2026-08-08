import { env } from "../../config/env";
import { pool } from "../../db/pool";
import { findUserByFirebaseUid } from "../auth/auth.repository";
import type { DemoFundingInput } from "./transactions.schema";
import {
  DemoFundingRecord,
  TransactionsRepository,
} from "./transactions.repository";

export class TransactionsServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TransactionsServiceError";
  }
}

export class TransactionsService {
  constructor(
    private readonly transactionsRepository =
      new TransactionsRepository(),
  ) {}

    async createDemoFunding(
    firebaseUid: string,
    input: DemoFundingInput,
    idempotencyKey: string,
  ): Promise<DemoFundingRecord> {
    if (!env.DEMO_FUNDING_ENABLED) {
      throw new TransactionsServiceError(
        403,
        "DEMO_FUNDING_DISABLED",
        "La carga de saldo demo no está habilitada",
      );
    }

    const normalizedIdempotencyKey = idempotencyKey.trim();

    if (
      normalizedIdempotencyKey.length === 0 ||
      normalizedIdempotencyKey.length > 100
    ) {
      throw new TransactionsServiceError(
        400,
        "INVALID_IDEMPOTENCY_KEY",
        "El encabezado Idempotency-Key es obligatorio y debe tener hasta 100 caracteres",
      );
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

            const user = await findUserByFirebaseUid(client, firebaseUid);

      if (!user) {
        throw new TransactionsServiceError(
          404,
          "USER_NOT_FOUND",
          "Usuario no encontrado",
        );
      }

      if (user.status !== "active") {
        throw new TransactionsServiceError(
          403,
          "USER_INACTIVE",
          "El usuario no está activo",
        );
      }

      const wallet =
        await this.transactionsRepository.findWalletByUserId(
          client,
          user.id,
        );

      if (!wallet) {
        throw new TransactionsServiceError(
          404,
          "WALLET_NOT_FOUND",
          "Billetera no encontrada",
        );
      }

      if (wallet.status !== "active") {
        throw new TransactionsServiceError(
          403,
          "WALLET_INACTIVE",
          "La billetera no está activa",
        );
      }

      const existingTransaction =
        await this.transactionsRepository.findDemoFundingByIdempotencyKey(
          client,
          normalizedIdempotencyKey,
          wallet.id,
        );

      if (existingTransaction) {
        await client.query("COMMIT");
        return existingTransaction;
      }

            const balance =
        await this.transactionsRepository.findBalanceForUpdate(
          client,
          wallet.id,
          input.currency,
        );

      if (!balance) {
        throw new TransactionsServiceError(
          404,
          "BALANCE_NOT_FOUND",
          `No existe un saldo en ${input.currency} para esta billetera`,
        );
      }

      const transactionId =
        await this.transactionsRepository.createIncomeTransaction(
          client,
          wallet.id,
          normalizedIdempotencyKey,
        );

      await this.transactionsRepository.createDemoIncome(
        client,
        transactionId,
      );

      const balanceAfter =
        await this.transactionsRepository.increaseBalance(
          client,
          balance.id,
          input.amount,
        );

      await this.transactionsRepository.createCreditMovement(
        client,
        transactionId,
        balance.id,
        input.amount,
        balance.amount,
        balanceAfter,
      );

      const createdTransaction =
        await this.transactionsRepository.findDemoFundingByIdempotencyKey(
          client,
          normalizedIdempotencyKey,
          wallet.id,
        );

      if (!createdTransaction) {
        throw new Error(
          "No se pudo recuperar la carga de saldo demo creada",
        );
      }

      await client.query("COMMIT");

      return createdTransaction;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}