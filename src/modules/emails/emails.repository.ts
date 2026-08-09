import { pool } from "../../db/pool";

export type EmailDeliveryEvent =
  | "completed"
  | "failed"
  | "payment_request_created"
  | "payment_request_paid"
  | "transfer_completed";

export type EmailDeliveryContext =
  | {
      transactionId: string;
      paymentRequestId?: never;
    }
  | {
      transactionId?: never;
      paymentRequestId: string;
    };

export interface PendingEmailDelivery {
  id: string;
  attempt_number: number;
}

export class EmailsRepository {
  async createPendingDelivery(
    context: EmailDeliveryContext,
    event: EmailDeliveryEvent,
    recipientEmail: string,
  ): Promise<PendingEmailDelivery> {
    const transactionId =
      "transactionId" in context
        ? context.transactionId
        : null;

    const paymentRequestId =
      "paymentRequestId" in context
        ? context.paymentRequestId
        : null;

    const result = await pool.query<PendingEmailDelivery>(
      `
        INSERT INTO email_deliveries (
          transaction_id,
          payment_request_id,
          transaction_event,
          recipient_email,
          attempt_number,
          status,
          provider
        )
        SELECT
          $1::uuid,
          $2::uuid,
          $3,
          $4,
          COALESCE(MAX(attempt_number), 0) + 1,
          'pending',
          'aws_ses'
        FROM email_deliveries
        WHERE recipient_email = $4
          AND transaction_event = $3
          AND (
            ($1::uuid IS NOT NULL AND transaction_id = $1::uuid)
            OR
            (
              $2::uuid IS NOT NULL
              AND payment_request_id = $2::uuid
            )
          )
        RETURNING id, attempt_number
      `,
      [
        transactionId,
        paymentRequestId,
        event,
        recipientEmail,
      ],
    );

    return result.rows[0];
  }

  async markAsSent(
    deliveryId: string,
    providerMessageId: string,
  ): Promise<void> {
    await pool.query(
      `
        UPDATE email_deliveries
        SET
          status = 'sent',
          provider_message_id = $2,
          sent_at = CURRENT_TIMESTAMP,
          error_message = NULL
        WHERE id = $1
      `,
      [deliveryId, providerMessageId],
    );
  }

  async markAsFailed(
    deliveryId: string,
    errorMessage: string,
  ): Promise<void> {
    await pool.query(
      `
        UPDATE email_deliveries
        SET
          status = 'failed',
          provider_message_id = NULL,
          sent_at = NULL,
          error_message = $2
        WHERE id = $1
      `,
      [deliveryId, errorMessage],
    );
  }
}