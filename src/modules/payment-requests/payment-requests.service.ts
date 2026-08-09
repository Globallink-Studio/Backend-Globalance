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
}