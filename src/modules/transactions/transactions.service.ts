import { env } from "../../config/env";
import { pool } from "../../db/pool";
import { findUserByFirebaseUid } from "../auth/auth.repository";
import {
  RateProvider,
  RateProviderError,
} from "../exchange/rate-provider";
import type {
  DemoFundingInput,
  ExchangeInput,
  InternalTransferInput,
} from "./transactions.schema";
import {
  DemoFundingRecord,
  ExchangeRecord,
  InternalTransferRecord,
  TransactionsRepository,
} from "./transactions.repository";
import { EmailsService } from "../emails/emails.service";
import { createTransferReceipt } from "../emails/emails.templates";

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

const EXCHANGE_DAILY_LIMIT = 30;

export class TransactionsService {
  constructor(
    private readonly transactionsRepository =
      new TransactionsRepository(),
    private readonly rateProvider = new RateProvider(),
    private readonly emailsService = new EmailsService(),
  ) { }

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

  async createExchange(
    firebaseUid: string,
    input: ExchangeInput,
    idempotencyKey: string,
  ): Promise<ExchangeRecord> {
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

    let exchangeRate;

    try {
      exchangeRate = await this.rateProvider.getRate(
        input.sourceCurrency,
        input.targetCurrency,
      );
    } catch (error) {
      if (error instanceof RateProviderError) {
        throw new TransactionsServiceError(
          502,
          "RATE_PROVIDER_UNAVAILABLE",
          error.message,
        );
      }

      throw error;
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
        await this.transactionsRepository.findExchangeByIdempotencyKey(
          client,
          normalizedIdempotencyKey,
          wallet.id,
        );

      if (existingTransaction) {
        await client.query("COMMIT");
        return existingTransaction;
      }

      const dailyCount =
        await this.transactionsRepository.countDailyExchangeOperations(
          client,
          wallet.id,
          user.timezone,
        );

      if (dailyCount >= EXCHANGE_DAILY_LIMIT) {
        throw new TransactionsServiceError(
          429,
          "EXCHANGE_DAILY_LIMIT_REACHED",
          `Se alcanzó el límite diario de ${EXCHANGE_DAILY_LIMIT} operaciones de cambio`,
        );
      }

      const type = this.classifyExchangeType(
        user.display_currency,
        input.sourceCurrency,
        input.targetCurrency,
      );

      const description = this.buildExchangeDescription(
        type,
        input.sourceCurrency,
        input.targetCurrency,
      );

      const sourceBalance =
        await this.transactionsRepository.findBalanceForUpdate(
          client,
          wallet.id,
          input.sourceCurrency,
        );

      if (!sourceBalance) {
        throw new TransactionsServiceError(
          404,
          "BALANCE_NOT_FOUND",
          `No existe un saldo en ${input.sourceCurrency} para esta billetera`,
        );
      }

      const targetBalance =
        await this.transactionsRepository.findBalanceForUpdate(
          client,
          wallet.id,
          input.targetCurrency,
        );

      if (!targetBalance) {
        throw new TransactionsServiceError(
          404,
          "BALANCE_NOT_FOUND",
          `No existe un saldo en ${input.targetCurrency} para esta billetera`,
        );
      }

      if (
        Number(sourceBalance.amount) < Number(input.sourceAmount)
      ) {
        throw new TransactionsServiceError(
          422,
          "INSUFFICIENT_FUNDS",
          `El saldo en ${input.sourceCurrency} no alcanza para la operación`,
        );
      }

      const transactionId =
        await this.transactionsRepository.createExchangeTransaction(
          client,
          wallet.id,
          normalizedIdempotencyKey,
          type,
          description,
        );

      const targetAmount =
        await this.transactionsRepository.createConversion(
          client,
          transactionId,
          input.sourceCurrency,
          input.targetCurrency,
          input.sourceAmount,
          String(exchangeRate.rate),
          exchangeRate.provider,
          exchangeRate.fetchedAt,
        );

      const sourceBalanceAfter =
        await this.transactionsRepository.decreaseBalance(
          client,
          sourceBalance.id,
          input.sourceAmount,
        );

      if (!sourceBalanceAfter) {
        throw new TransactionsServiceError(
          400,
          "INSUFFICIENT_FUNDS",
          "Saldo insuficiente para realizar la conversión",
        );
      }

      await this.transactionsRepository.createDebitMovement(
        client,
        transactionId,
        sourceBalance.id,
        input.sourceAmount,
        sourceBalance.amount,
        sourceBalanceAfter,
      );

      const targetBalanceAfter =
        await this.transactionsRepository.increaseBalance(
          client,
          targetBalance.id,
          targetAmount,
        );

      await this.transactionsRepository.createCreditMovement(
        client,
        transactionId,
        targetBalance.id,
        targetAmount,
        targetBalance.amount,
        targetBalanceAfter,
      );

      const createdTransaction =
        await this.transactionsRepository.findExchangeByIdempotencyKey(
          client,
          normalizedIdempotencyKey,
          wallet.id,
        );

      if (!createdTransaction) {
        throw new Error(
          "No se pudo recuperar la operación de cambio creada",
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

  private classifyExchangeType(
    displayCurrency: string,
    sourceCurrency: string,
    targetCurrency: string,
  ): "purchase" | "sale" | "conversion" {
    if (sourceCurrency === displayCurrency) {
      return "sale";
    }

    if (targetCurrency === displayCurrency) {
      return "purchase";
    }

    return "conversion";
  }

  private buildExchangeDescription(
    type: "purchase" | "sale" | "conversion",
    sourceCurrency: string,
    targetCurrency: string,
  ): string {
    if (type === "sale") {
      return `Venta de ${sourceCurrency} por ${targetCurrency}`;
    }

    if (type === "purchase") {
      return `Compra de ${targetCurrency} con ${sourceCurrency}`;
    }

    return `Conversión de ${sourceCurrency} a ${targetCurrency}`;
  }

  async createInternalTransfer(
    firebaseUid: string,
    input: InternalTransferInput,
    idempotencyKey: string,
  ): Promise<InternalTransferRecord> {
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

    let transactionFinished = false;

    try {
      await client.query("BEGIN");

      const user = await findUserByFirebaseUid(
        client,
        firebaseUid,
      );

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

      const sourceWallet =
        await this.transactionsRepository.findWalletByUserId(
          client,
          user.id,
        );

      if (!sourceWallet) {
        throw new TransactionsServiceError(
          404,
          "SOURCE_WALLET_NOT_FOUND",
          "Billetera emisora no encontrada",
        );
      }

      if (sourceWallet.status !== "active") {
        throw new TransactionsServiceError(
          403,
          "SOURCE_WALLET_INACTIVE",
          "La billetera emisora no está activa",
        );
      }

      const destinationWallet =
        await this.transactionsRepository.findDestinationWallet(
          client,
          input.destinationType,
          input.destinationValue,
        );

      if (!destinationWallet) {
        throw new TransactionsServiceError(
          404,
          "DESTINATION_WALLET_NOT_FOUND",
          "Billetera destinataria no encontrada",
        );
      }

      if (destinationWallet.id === sourceWallet.id) {
        throw new TransactionsServiceError(
          400,
          "SELF_TRANSFER_NOT_ALLOWED",
          "No se puede transferir a la misma billetera",
        );
      }

      if (destinationWallet.status !== "active") {
        throw new TransactionsServiceError(
          403,
          "DESTINATION_WALLET_INACTIVE",
          "La billetera destinataria no está activa",
        );
      }

      const destinationEmail =
        await this.transactionsRepository.findUserEmailById(
          client,
          destinationWallet.user_id,
        );

      if (!destinationEmail) {
        throw new TransactionsServiceError(
          404,
          "DESTINATION_USER_NOT_FOUND",
          "No se encontró el usuario destinatario",
        );
      }

      const existingTransfer =
        await this.transactionsRepository
          .findInternalTransferByIdempotencyKey(
            client,
            normalizedIdempotencyKey,
            sourceWallet.id,
          );

      if (existingTransfer) {
        await client.query("COMMIT");
        return existingTransfer;
      }

      const balances =
        await this.transactionsRepository
          .findTransferBalancesForUpdate(
            client,
            [
              sourceWallet.id,
              destinationWallet.id,
            ],
            input.currency,
          );

      const sourceBalance = balances.find(
        (balance) =>
          balance.wallet_id === sourceWallet.id,
      );

      const destinationBalance = balances.find(
        (balance) =>
          balance.wallet_id === destinationWallet.id,
      );

      if (!sourceBalance) {
        throw new TransactionsServiceError(
          404,
          "SOURCE_BALANCE_NOT_FOUND",
          `La billetera emisora no tiene saldo en ${input.currency}`,
        );
      }

      if (!destinationBalance) {
        throw new TransactionsServiceError(
          404,
          "DESTINATION_BALANCE_NOT_FOUND",
          `La billetera destinataria no tiene saldo en ${input.currency}`,
        );
      }

      const transactionId =
        await this.transactionsRepository
          .createTransferTransaction(
            client,
            sourceWallet.id,
            normalizedIdempotencyKey,
          );

      await this.transactionsRepository
        .createInternalTransferDetail(
          client,
          transactionId,
          destinationWallet.id,
          input.currency,
          input.amount,
        );

      const sourceBalanceAfter =
        await this.transactionsRepository.decreaseBalance(
          client,
          sourceBalance.id,
          input.amount,
        );

      if (!sourceBalanceAfter) {
        throw new TransactionsServiceError(
          400,
          "INSUFFICIENT_FUNDS",
          "Saldo insuficiente para realizar la transferencia",
        );
      }

      const destinationBalanceAfter =
        await this.transactionsRepository.increaseBalance(
          client,
          destinationBalance.id,
          input.amount,
        );

      await this.transactionsRepository.createDebitMovement(
        client,
        transactionId,
        sourceBalance.id,
        input.amount,
        sourceBalance.amount,
        sourceBalanceAfter,
      );

      await this.transactionsRepository.createCreditMovement(
        client,
        transactionId,
        destinationBalance.id,
        input.amount,
        destinationBalance.amount,
        destinationBalanceAfter,
      );

      const createdTransfer =
        await this.transactionsRepository
          .findInternalTransferByIdempotencyKey(
            client,
            normalizedIdempotencyKey,
            sourceWallet.id,
          );

      if (!createdTransfer) {
        throw new Error(
          "No se pudo recuperar la transferencia interna creada",
        );
      }

      await client.query("COMMIT");
      transactionFinished = true;

      await Promise.all([
        this.emailsService.sendTrackedEmail({
          context: { transactionId },
          event: "transfer_completed",
          recipientEmail: user.email,
          content: createTransferReceipt({
            direction: "sent",
            counterpartName: destinationWallet.alias,
            amount: input.amount,
            currency: input.currency,
            transactionId,
          }),
        }),
        this.emailsService.sendTrackedEmail({
          context: { transactionId },
          event: "transfer_completed",
          recipientEmail: destinationEmail,
          content: createTransferReceipt({
            direction: "received",
            counterpartName: user.email,
            amount: input.amount,
            currency: input.currency,
            transactionId,
          }),
        }),
      ]);

      return createdTransfer;
    } catch (error) {
      if (!transactionFinished) {
        await client.query("ROLLBACK");
      }

      throw error;
    }
  }
}