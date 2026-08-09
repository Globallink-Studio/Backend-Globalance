import { env } from "../../config/env";
import { pool } from "../../db/pool";
import { findUserByFirebaseUid } from "../auth/auth.repository";
import type {
  CreatePaymentRequestInput,
  ListPaymentRequestsQuery,
} from "./payment-requests.schema";
import {
  PaymentRequestListItem,
  PaymentRequestRecord,
  PaymentRequestsRepository,
} from "./payment-requests.repository";
import { TransactionsRepository } from "../transactions/transactions.repository";
import { EmailsService } from "../emails/emails.service";
import {
  createPaymentReceipt,
  createPaymentRequestInvitation,
} from "../emails/emails.templates";

export class PaymentRequestsServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PaymentRequestsServiceError";
  }
}

export interface CreatedPaymentRequest
  extends PaymentRequestRecord {
  payment_url: string;
}

export interface PaymentRequestDetails
  extends PaymentRequestRecord {
  requester_email: string;
}

export class PaymentRequestsService {
  constructor(
    private readonly paymentRequestsRepository =
      new PaymentRequestsRepository(),
    private readonly transactionsRepository =
      new TransactionsRepository(),
    private readonly emailsService =
      new EmailsService(),
  ) { }

  async createPaymentRequest(
    firebaseUid: string,
    input: CreatePaymentRequestInput,
  ): Promise<CreatedPaymentRequest> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const requester = await findUserByFirebaseUid(
        client,
        firebaseUid,
      );

      if (!requester) {
        throw new PaymentRequestsServiceError(
          404,
          "REQUESTER_NOT_FOUND",
          "Usuario solicitante no encontrado",
        );
      }

      if (requester.status !== "active") {
        throw new PaymentRequestsServiceError(
          403,
          "REQUESTER_INACTIVE",
          "El usuario solicitante no está activo",
        );
      }

      const payer =
        await this.paymentRequestsRepository.findUserByEmail(
          client,
          input.payerEmail,
        );

      if (!payer) {
        throw new PaymentRequestsServiceError(
          404,
          "PAYER_NOT_FOUND",
          "El correo no corresponde a un usuario registrado",
        );
      }

      if (payer.status !== "active") {
        throw new PaymentRequestsServiceError(
          403,
          "PAYER_INACTIVE",
          "El usuario pagador no está activo",
        );
      }

      if (payer.id === requester.id) {
        throw new PaymentRequestsServiceError(
          400,
          "SELF_PAYMENT_REQUEST_NOT_ALLOWED",
          "No se puede crear una solicitud de cobro para uno mismo",
        );
      }

      const paymentRequest =
        await this.paymentRequestsRepository.create(
          client,
          requester.id,
          payer.id,
          input.currency,
          input.amount,
        );

      await client.query("COMMIT");

      const paymentUrl =
        `${env.FRONTEND_URL}/pay/${paymentRequest.payment_token}`;

      await this.emailsService.sendTrackedEmail({
        context: {
          paymentRequestId: paymentRequest.id,
        },
        event: "payment_request_created",
        recipientEmail: payer.email,
        content: createPaymentRequestInvitation({
          requesterName: requester.email,
          amount: paymentRequest.amount,
          currency: paymentRequest.currency_code,
          paymentUrl,
        }),
      });

      return {
        ...paymentRequest,
        payment_url: paymentUrl,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelPaymentRequest(
    firebaseUid: string,
    paymentRequestId: string,
  ): Promise<PaymentRequestRecord> {
    const client = await pool.connect();
    let transactionFinished = false;

    try {
      await client.query("BEGIN");

      const requester = await findUserByFirebaseUid(
        client,
        firebaseUid,
      );

      if (!requester) {
        throw new PaymentRequestsServiceError(
          404,
          "REQUESTER_NOT_FOUND",
          "Usuario solicitante no encontrado",
        );
      }

      const paymentRequest =
        await this.paymentRequestsRepository.findByIdForUpdate(
          client,
          paymentRequestId,
        );

      if (!paymentRequest) {
        throw new PaymentRequestsServiceError(
          404,
          "PAYMENT_REQUEST_NOT_FOUND",
          "Solicitud de cobro no encontrada",
        );
      }

      if (
        paymentRequest.requester_user_id !== requester.id
      ) {
        throw new PaymentRequestsServiceError(
          403,
          "PAYMENT_REQUEST_FORBIDDEN",
          "Solo el usuario que creó la solicitud puede cancelarla",
        );
      }

      if (
        paymentRequest.status === "pending" &&
        paymentRequest.expires_at.getTime() <= Date.now()
      ) {
        await this.paymentRequestsRepository.markAsExpired(
          client,
          paymentRequest.id,
        );

        await client.query("COMMIT");
        transactionFinished = true;

        throw new PaymentRequestsServiceError(
          409,
          "PAYMENT_REQUEST_EXPIRED",
          "La solicitud de cobro está vencida",
        );
      }

      if (paymentRequest.status !== "pending") {
        throw new PaymentRequestsServiceError(
          409,
          "PAYMENT_REQUEST_NOT_PENDING",
          "Solo se puede cancelar una solicitud pendiente",
        );
      }

      const cancelledPaymentRequest =
        await this.paymentRequestsRepository.cancel(
          client,
          paymentRequest.id,
        );

      await client.query("COMMIT");
      transactionFinished = true;

      return cancelledPaymentRequest;
    } catch (error) {
      if (!transactionFinished) {
        await client.query("ROLLBACK");
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async payPaymentRequest(
    firebaseUid: string,
    paymentToken: string,
    idempotencyKey: string,
  ): Promise<PaymentRequestRecord> {
    const normalizedIdempotencyKey = idempotencyKey.trim();

    if (
      normalizedIdempotencyKey.length === 0 ||
      normalizedIdempotencyKey.length > 100
    ) {
      throw new PaymentRequestsServiceError(
        400,
        "INVALID_IDEMPOTENCY_KEY",
        "El encabezado Idempotency-Key es obligatorio y debe tener hasta 100 caracteres",
      );
    }

    const client = await pool.connect();
    let transactionFinished = false;

    try {
      await client.query("BEGIN");

      const payer = await findUserByFirebaseUid(
        client,
        firebaseUid,
      );

      if (!payer) {
        throw new PaymentRequestsServiceError(
          404,
          "PAYER_NOT_FOUND",
          "Usuario pagador no encontrado",
        );
      }

      if (payer.status !== "active") {
        throw new PaymentRequestsServiceError(
          403,
          "PAYER_INACTIVE",
          "El usuario pagador no está activo",
        );
      }

      const paymentRequest =
        await this.paymentRequestsRepository
          .findByTokenForUpdate(
            client,
            paymentToken,
          );

      if (!paymentRequest) {
        throw new PaymentRequestsServiceError(
          404,
          "PAYMENT_REQUEST_NOT_FOUND",
          "Solicitud de cobro no encontrada",
        );
      }

      if (paymentRequest.payer_user_id !== payer.id) {
        throw new PaymentRequestsServiceError(
          403,
          "PAYMENT_REQUEST_FORBIDDEN",
          "Solo el destinatario puede pagar esta solicitud",
        );
      }

      if (paymentRequest.status === "paid") {
        if (paymentRequest.status === "paid") {
          await client.query("COMMIT");
          transactionFinished = true;

          return paymentRequest;
        }
      }

      if (
        paymentRequest.status === "pending" &&
        paymentRequest.expires_at.getTime() <= Date.now()
      ) {
        await this.paymentRequestsRepository.markAsExpired(
          client,
          paymentRequest.id,
        );

        await client.query("COMMIT");
        transactionFinished = true;

        throw new PaymentRequestsServiceError(
          409,
          "PAYMENT_REQUEST_EXPIRED",
          "La solicitud de cobro está vencida",
        );
      }

      if (paymentRequest.status !== "pending") {
        throw new PaymentRequestsServiceError(
          409,
          "PAYMENT_REQUEST_NOT_PENDING",
          "La solicitud de cobro no está disponible para pagar",
        );
      }

      const requester =
        await this.paymentRequestsRepository.findUserById(
          client,
          paymentRequest.requester_user_id,
        );

      if (!requester || requester.status !== "active") {
        throw new PaymentRequestsServiceError(
          403,
          "REQUESTER_INACTIVE",
          "El usuario que solicitó el cobro no está activo",
        );
      }

      const payerWallet =
        await this.transactionsRepository.findWalletByUserId(
          client,
          payer.id,
        );

      const requesterWallet =
        await this.transactionsRepository.findWalletByUserId(
          client,
          requester.id,
        );

      if (!payerWallet || payerWallet.status !== "active") {
        throw new PaymentRequestsServiceError(
          403,
          "PAYER_WALLET_UNAVAILABLE",
          "La billetera del pagador no está disponible",
        );
      }

      if (
        !requesterWallet ||
        requesterWallet.status !== "active"
      ) {
        throw new PaymentRequestsServiceError(
          403,
          "REQUESTER_WALLET_UNAVAILABLE",
          "La billetera del receptor no está disponible",
        );
      }

      const balances =
        await this.transactionsRepository
          .findTransferBalancesForUpdate(
            client,
            [payerWallet.id, requesterWallet.id],
            paymentRequest.currency_code,
          );

      const payerBalance = balances.find(
        (balance) =>
          balance.wallet_id === payerWallet.id,
      );

      const requesterBalance = balances.find(
        (balance) =>
          balance.wallet_id === requesterWallet.id,
      );

      if (!payerBalance) {
        throw new PaymentRequestsServiceError(
          404,
          "PAYER_BALANCE_NOT_FOUND",
          `La billetera pagadora no tiene saldo en ${paymentRequest.currency_code}`,
        );
      }

      if (!requesterBalance) {
        throw new PaymentRequestsServiceError(
          404,
          "REQUESTER_BALANCE_NOT_FOUND",
          `La billetera receptora no tiene saldo en ${paymentRequest.currency_code}`,
        );
      }

      const transactionId =
        await this.transactionsRepository
          .createTransferTransaction(
            client,
            payerWallet.id,
            normalizedIdempotencyKey,
          );

      await this.transactionsRepository
        .createInternalTransferDetail(
          client,
          transactionId,
          requesterWallet.id,
          paymentRequest.currency_code,
          paymentRequest.amount,
        );

      const payerBalanceAfter =
        await this.transactionsRepository.decreaseBalance(
          client,
          payerBalance.id,
          paymentRequest.amount,
        );

      if (!payerBalanceAfter) {
        throw new PaymentRequestsServiceError(
          400,
          "INSUFFICIENT_FUNDS",
          "Saldo insuficiente para pagar la solicitud",
        );
      }

      const requesterBalanceAfter =
        await this.transactionsRepository.increaseBalance(
          client,
          requesterBalance.id,
          paymentRequest.amount,
        );

      await this.transactionsRepository.createDebitMovement(
        client,
        transactionId,
        payerBalance.id,
        paymentRequest.amount,
        payerBalance.amount,
        payerBalanceAfter,
      );

      await this.transactionsRepository.createCreditMovement(
        client,
        transactionId,
        requesterBalance.id,
        paymentRequest.amount,
        requesterBalance.amount,
        requesterBalanceAfter,
      );

      const paidPaymentRequest =
        await this.paymentRequestsRepository.markAsPaid(
          client,
          paymentRequest.id,
          transactionId,
        );

      if (!paidPaymentRequest) {
        throw new Error(
          "No se pudo confirmar el pago de la solicitud",
        );
      }

      await client.query("COMMIT");
      transactionFinished = true;

      await Promise.all([
        this.emailsService.sendTrackedEmail({
          context: { transactionId },
          event: "payment_request_paid",
          recipientEmail: payer.email,
          content: createPaymentReceipt({
            recipientRole: "payer",
            counterpartName: requester.email,
            amount: paymentRequest.amount,
            currency: paymentRequest.currency_code,
            transactionId,
          }),
        }),
        this.emailsService.sendTrackedEmail({
          context: { transactionId },
          event: "payment_request_paid",
          recipientEmail: requester.email,
          content: createPaymentReceipt({
            recipientRole: "receiver",
            counterpartName: payer.email,
            amount: paymentRequest.amount,
            currency: paymentRequest.currency_code,
            transactionId,
          }),
        }),
      ]);

      return paidPaymentRequest;
    } catch (error) {
      if (!transactionFinished) {
        await client.query("ROLLBACK");
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async getPaymentRequestByToken(
    firebaseUid: string,
    paymentToken: string,
  ): Promise<PaymentRequestDetails> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const viewer = await findUserByFirebaseUid(
        client,
        firebaseUid,
      );

      if (!viewer) {
        throw new PaymentRequestsServiceError(
          404,
          "USER_NOT_FOUND",
          "Usuario no encontrado",
        );
      }

      const paymentRequest =
        await this.paymentRequestsRepository
          .findByTokenForUpdate(
            client,
            paymentToken,
          );

      if (!paymentRequest) {
        throw new PaymentRequestsServiceError(
          404,
          "PAYMENT_REQUEST_NOT_FOUND",
          "Solicitud de cobro no encontrada",
        );
      }

      const canView =
        paymentRequest.requester_user_id === viewer.id ||
        paymentRequest.payer_user_id === viewer.id;

      if (!canView) {
        throw new PaymentRequestsServiceError(
          403,
          "PAYMENT_REQUEST_FORBIDDEN",
          "No tenés permiso para consultar esta solicitud",
        );
      }

      const requester =
        await this.paymentRequestsRepository.findUserById(
          client,
          paymentRequest.requester_user_id,
        );

      if (!requester) {
        throw new PaymentRequestsServiceError(
          404,
          "REQUESTER_NOT_FOUND",
          "Usuario solicitante no encontrado",
        );
      }

      let currentPaymentRequest = paymentRequest;

      if (
        paymentRequest.status === "pending" &&
        paymentRequest.expires_at.getTime() <= Date.now()
      ) {
        await this.paymentRequestsRepository.markAsExpired(
          client,
          paymentRequest.id,
        );

        currentPaymentRequest = {
          ...paymentRequest,
          status: "expired",
          updated_at: new Date(),
        };
      }

      await client.query("COMMIT");

      return {
        ...currentPaymentRequest,
        requester_email: requester.email,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listPaymentRequests(
    firebaseUid: string,
    query: ListPaymentRequestsQuery,
  ): Promise<PaymentRequestListItem[]> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const user = await findUserByFirebaseUid(
        client,
        firebaseUid,
      );

      if (!user) {
        throw new PaymentRequestsServiceError(
          404,
          "USER_NOT_FOUND",
          "Usuario no encontrado",
        );
      }

      await this.paymentRequestsRepository.markExpiredForUser(
        client,
        user.id,
      );

      const paymentRequests =
        await this.paymentRequestsRepository.listByUser(
          client,
          user.id,
          query.scope,
          query.status,
          query.limit,
          query.offset,
        );

      await client.query("COMMIT");

      return paymentRequests;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}