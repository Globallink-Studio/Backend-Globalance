import type { PoolClient } from "pg";

export interface PaymentRequestUser {
  id: string;
  email: string;
  status: "active" | "inactive" | "blocked";
}

export interface PaymentRequestRecord {
  id: string;
  payment_token: string;
  requester_user_id: string;
  payer_user_id: string;
  payer_email: string;
  currency_code: string;
  amount: string;
  status: "pending" | "paid" | "expired" | "cancelled";
  paid_transaction_id: string | null;
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
  paid_at: Date | null;
  cancelled_at: Date | null;
}

export class PaymentRequestsRepository {
  async findUserByEmail(
    client: PoolClient,
    email: string,
  ): Promise<PaymentRequestUser | null> {
    const result = await client.query<PaymentRequestUser>(
      `
        SELECT
          id,
          email,
          status
        FROM users
        WHERE email = $1
      `,
      [email],
    );

    return result.rows[0] ?? null;
  }

  async create(
    client: PoolClient,
    requesterUserId: string,
    payerUserId: string,
    currencyCode: string,
    amount: string,
  ): Promise<PaymentRequestRecord> {
    const result = await client.query<PaymentRequestRecord>(
      `
        INSERT INTO payment_requests (
          requester_user_id,
          payer_user_id,
          currency_code,
          amount
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          payment_token,
          requester_user_id,
          payer_user_id,
          (
            SELECT email
            FROM users
            WHERE id = payer_user_id
          ) AS payer_email,
          currency_code,
          amount,
          status,
          paid_transaction_id,
          created_at,
          updated_at,
          expires_at,
          paid_at,
          cancelled_at
      `,
      [
        requesterUserId,
        payerUserId,
        currencyCode,
        amount,
      ],
    );

    return result.rows[0];
  }

    async findByIdForUpdate(
    client: PoolClient,
    paymentRequestId: string,
  ): Promise<PaymentRequestRecord | null> {
    const result = await client.query<PaymentRequestRecord>(
      `
        SELECT
          pr.id,
          pr.payment_token,
          pr.requester_user_id,
          pr.payer_user_id,
          payer.email AS payer_email,
          pr.currency_code,
          pr.amount,
          pr.status,
          pr.paid_transaction_id,
          pr.created_at,
          pr.updated_at,
          pr.expires_at,
          pr.paid_at,
          pr.cancelled_at
        FROM payment_requests AS pr
        INNER JOIN users AS payer
          ON payer.id = pr.payer_user_id
        WHERE pr.id = $1
        FOR UPDATE OF pr
      `,
      [paymentRequestId],
    );

    return result.rows[0] ?? null;
  }

  async markAsExpired(
    client: PoolClient,
    paymentRequestId: string,
  ): Promise<void> {
    await client.query(
      `
        UPDATE payment_requests
        SET
          status = 'expired',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND status = 'pending'
      `,
      [paymentRequestId],
    );
  }

  async cancel(
    client: PoolClient,
    paymentRequestId: string,
  ): Promise<PaymentRequestRecord> {
    const result = await client.query<PaymentRequestRecord>(
      `
        UPDATE payment_requests AS pr
        SET
          status = 'cancelled',
          cancelled_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        FROM users AS payer
        WHERE pr.id = $1
          AND pr.payer_user_id = payer.id
          AND pr.status = 'pending'
        RETURNING
          pr.id,
          pr.payment_token,
          pr.requester_user_id,
          pr.payer_user_id,
          payer.email AS payer_email,
          pr.currency_code,
          pr.amount,
          pr.status,
          pr.paid_transaction_id,
          pr.created_at,
          pr.updated_at,
          pr.expires_at,
          pr.paid_at,
          pr.cancelled_at
      `,
      [paymentRequestId],
    );

    return result.rows[0];
  }
}