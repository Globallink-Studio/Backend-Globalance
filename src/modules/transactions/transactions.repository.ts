import type { PoolClient } from "pg";

export interface DemoFundingRecord {
  transaction_id: string;
  status: string;
  currency: string;
  amount: string;
  balance_before: string;
  balance_after: string;
  created_at: Date;
}

export interface TransactionWallet {
  id: string;
  status: "active" | "inactive" | "blocked";
}

export interface LockedBalance {
  id: string;
  amount: string;
}

export class TransactionsRepository {
  async findWalletByUserId(
    client: PoolClient,
    userId: string,
  ): Promise<TransactionWallet | null> {
    const result = await client.query<TransactionWallet>(
      `
        SELECT id, status
        FROM wallets
        WHERE user_id = $1
      `,
      [userId],
    );

    return result.rows[0] ?? null;
  }

    async findBalanceForUpdate(
    client: PoolClient,
    walletId: string,
    currency: string,
  ): Promise<LockedBalance | null> {
    const result = await client.query<LockedBalance>(
      `
        SELECT id, amount
        FROM balances
        WHERE wallet_id = $1
          AND currency_code = $2
        FOR UPDATE
      `,
      [walletId, currency],
    );

    return result.rows[0] ?? null;
  }

    async findDemoFundingByIdempotencyKey(
    client: PoolClient,
    idempotencyKey: string,
    walletId: string,
  ): Promise<DemoFundingRecord | null> {
    const result = await client.query<DemoFundingRecord>(
      `
        SELECT
          t.id AS transaction_id,
          t.status,
          b.currency_code AS currency,
          m.amount,
          m.balance_before,
          m.balance_after,
          t.created_at
        FROM transactions AS t
        INNER JOIN incomes AS i
          ON i.transaction_id = t.id
        INNER JOIN movements AS m
          ON m.transaction_id = t.id
        INNER JOIN balances AS b
          ON b.id = m.balance_id
        WHERE t.idempotency_key = $1
          AND t.wallet_id = $2
          AND i.funding_method = 'demo'
      `,
      [idempotencyKey, walletId],
    );

    return result.rows[0] ?? null;
  }

    async createIncomeTransaction(
    client: PoolClient,
    walletId: string,
    idempotencyKey: string,
  ): Promise<string> {
    const result = await client.query<{ id: string }>(
      `
        INSERT INTO transactions (
          wallet_id,
          type,
          status,
          description,
          idempotency_key,
          completed_at
        )
        VALUES ($1, 'income', 'completed', $2, $3, CURRENT_TIMESTAMP)
        RETURNING id
      `,
      [walletId, "Carga de saldo demo", idempotencyKey],
    );

    return result.rows[0].id;
  }

    async createDemoIncome(
    client: PoolClient,
    transactionId: string,
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO incomes (
          transaction_id,
          income_type,
          funding_method
        )
        VALUES ($1, 'user_top_up', 'demo')
      `,
      [transactionId],
    );
  }

    async increaseBalance(
    client: PoolClient,
    balanceId: string,
    amount: string,
  ): Promise<string> {
    const result = await client.query<{ amount: string }>(
      `
        UPDATE balances
        SET
          amount = amount + $2::numeric,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING amount
      `,
      [balanceId, amount],
    );

    return result.rows[0].amount;
  }

    async createCreditMovement(
    client: PoolClient,
    transactionId: string,
    balanceId: string,
    amount: string,
    balanceBefore: string,
    balanceAfter: string,
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO movements (
          transaction_id,
          balance_id,
          direction,
          concept,
          amount,
          balance_before,
          balance_after
        )
        VALUES ($1, $2, 'credit', 'principal', $3, $4, $5)
      `,
      [
        transactionId,
        balanceId,
        amount,
        balanceBefore,
        balanceAfter,
      ],
    );
  }
}
