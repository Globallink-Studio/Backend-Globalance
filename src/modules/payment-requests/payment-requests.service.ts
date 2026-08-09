import { env } from "../../config/env";
import { pool } from "../../db/pool";
import { findUserByFirebaseUid } from "../auth/auth.repository";
import type { CreatePaymentRequestInput } from "./payment-requests.schema";
import {
  PaymentRequestRecord,
  PaymentRequestsRepository,
} from "./payment-requests.repository";

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

export class PaymentRequestsService {
  constructor(
    private readonly paymentRequestsRepository =
      new PaymentRequestsRepository(),
  ) {}

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

      return {
        ...paymentRequest,
        payment_url:
          `${env.FRONTEND_URL}/pay/${paymentRequest.payment_token}`,
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
}