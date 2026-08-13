import { pool } from "../../db/pool";

export type EmailDeliveryEvent =
  | "completed"
  | "failed"
  | "payment_request_created"
  | "payment_request_paid"
  | "transfer_completed"
  | "income_completed"
  | "exchange_completed";

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

export interface EmailDeliveryContent {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export interface FailedEmailDelivery {
  id: string;
  transaction_id: string | null;
  payment_request_id: string | null;
  transaction_event: EmailDeliveryEvent;
  recipient_email: string;
  subject: string | null;
  html_body: string | null;
  text_body: string | null;
}

export class EmailsRepository {
  async createPendingDelivery(
    context: EmailDeliveryContext,
    event: EmailDeliveryEvent,
    recipientEmail: string,
    content: EmailDeliveryContent,
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
          provider,
          subject,
          html_body,
          text_body
        )
        SELECT
          $1::uuid,
          $2::uuid,
          $3::varchar,
          $4,
          COALESCE(MAX(attempt_number), 0) + 1,
          'pending',
          'aws_ses',
          $5,
          $6,
          $7
        FROM email_deliveries
        WHERE recipient_email = $4
          AND transaction_event = $3::varchar
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
        content.subject,
        content.htmlBody,
        content.textBody,
      ],
    );

    return result.rows[0];
  }

  async findFailedDeliveryById(
    deliveryId: string,
  ): Promise<FailedEmailDelivery | null> {
    const result = await pool.query<FailedEmailDelivery>(
      `
      SELECT
        id,
        transaction_id,
        payment_request_id,
        transaction_event,
        recipient_email,
        subject,
        html_body,
        text_body
      FROM email_deliveries
      WHERE id = $1
        AND status = 'failed'
    `,
      [deliveryId],
    );

    return result.rows[0] ?? null;
  }

  async canUserRetryDelivery(
    deliveryId: string,
    firebaseUid: string,
  ): Promise<boolean> {
    const result = await pool.query<{ allowed: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM email_deliveries AS delivery
        INNER JOIN users AS authenticated_user
          ON authenticated_user.firebase_uid = $2
        LEFT JOIN transactions AS transaction
          ON transaction.id = delivery.transaction_id
        LEFT JOIN wallets AS source_wallet
          ON source_wallet.id = transaction.wallet_id
        LEFT JOIN transfers AS transfer
          ON transfer.transaction_id = transaction.id
        LEFT JOIN wallets AS destination_wallet
          ON destination_wallet.id =
             transfer.destination_wallet_id
        LEFT JOIN payment_requests AS payment_request
          ON payment_request.id =
             delivery.payment_request_id
        WHERE delivery.id = $1
          AND (
            source_wallet.user_id =
              authenticated_user.id
            OR destination_wallet.user_id =
              authenticated_user.id
            OR payment_request.requester_user_id =
              authenticated_user.id
            OR payment_request.payer_user_id =
              authenticated_user.id
          )
      ) AS allowed
    `,
      [deliveryId, firebaseUid],
    );

    return result.rows[0]?.allowed ?? false;
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