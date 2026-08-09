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

export interface TransactionHistoryMovement {
  direction: "debit" | "credit";
  concept: "principal" | "fee";
  currency: string;
  amount: string;
  balance_before: string;
  balance_after: string;
  created_at: Date;
}

export interface TransactionHistoryItem {
  id: string;
  type:
    | "income"
    | "purchase"
    | "sale"
    | "conversion"
    | "transfer";
  status: string;
  description: string | null;
  created_at: Date;
  completed_at: Date | null;
  movements: TransactionHistoryMovement[];
  source_currency: string | null;
  target_currency: string | null;
  applied_rate: string | null;
  rate_provider: string | null;
  rate_fetched_at: Date | null;
  destination_wallet_id: string | null;
  recipient_name: string | null;
  funding_method: string | null;
}

export interface TransactionCount {
  total: number;
}

export interface ExchangeRecord {
  transaction_id: string;
  type: "purchase" | "sale" | "conversion";
  status: string;
  description: string | null;
  created_at: Date;
  completed_at: Date | null;
  source_currency: string;
  target_currency: string;
  source_amount: string;
  target_amount: string;
  applied_rate: string;
  rate_provider: string;
  rate_fetched_at: Date;
  source_balance_after: string;
  target_balance_after: string;
}

export interface TransferDestinationWallet {
  id: string;
  user_id: string;
  alias: string;
  account_number: string;
  status: "active" | "inactive" | "blocked";
}

export interface TransferBalance {
  id: string;
  wallet_id: string;
  amount: string;
}

export interface InternalTransferRecord {
  transaction_id: string;
  status: string;
  destination_wallet_id: string;
  destination_alias: string;
  currency: string;
  amount: string;
  source_balance_after: string;
  destination_balance_after: string;
  created_at: Date;
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

    async findHistoryByWalletId(
    client: PoolClient,
    walletId: string,
    transactionType: TransactionHistoryItem["type"] | null,
    currency: string | null,
    limit: number,
    offset: number,
  ): Promise<TransactionHistoryItem[]> {
    const result = await client.query<TransactionHistoryItem>(
      `
        SELECT
          t.id,
          t.type,
          t.status,
          t.description,
          t.created_at,
          t.completed_at,
          COALESCE(
            movement_data.movements,
            '[]'::jsonb
          ) AS movements,
          c.source_currency,
          c.target_currency,
          c.applied_rate,
          c.rate_provider,
          c.rate_fetched_at,
          tr.destination_wallet_id,
          tr.recipient_name,
          i.funding_method
        FROM transactions AS t
        LEFT JOIN conversions AS c
          ON c.transaction_id = t.id
        LEFT JOIN transfers AS tr
          ON tr.transaction_id = t.id
        LEFT JOIN incomes AS i
          ON i.transaction_id = t.id
        LEFT JOIN LATERAL (
          SELECT jsonb_agg(
            jsonb_build_object(
              'direction', m.direction,
              'concept', m.concept,
              'currency', b.currency_code,
              'amount', m.amount::text,
              'balance_before', m.balance_before::text,
              'balance_after', m.balance_after::text,
              'created_at', m.created_at
            )
            ORDER BY m.created_at
          ) AS movements
          FROM movements AS m
          INNER JOIN balances AS b
            ON b.id = m.balance_id
          WHERE m.transaction_id = t.id
        ) AS movement_data ON TRUE
        WHERE (
          t.wallet_id = $1
          OR EXISTS (
            SELECT 1
            FROM movements AS wallet_movement
            INNER JOIN balances AS wallet_balance
              ON wallet_balance.id = wallet_movement.balance_id
            WHERE wallet_movement.transaction_id = t.id
              AND wallet_balance.wallet_id = $1
          )
        )
          AND ($2::varchar IS NULL OR t.type = $2)
          AND (
            $3::char(3) IS NULL
            OR EXISTS (
              SELECT 1
              FROM movements AS filtered_movement
              INNER JOIN balances AS filtered_balance
                ON filtered_balance.id =
                   filtered_movement.balance_id
              WHERE filtered_movement.transaction_id = t.id
                AND filtered_balance.currency_code =
                    $3::char(3)
            )
          )
        ORDER BY t.created_at DESC
        LIMIT $4
        OFFSET $5
      `,
      [
        walletId,
        transactionType,
        currency,
        limit,
        offset,
      ],
    );

    return result.rows;
  }

    async countMonthlyTransactions(
    client: PoolClient,
    walletId: string,
    timezone = "America/Argentina/Buenos_Aires",
  ): Promise<number> {
    const result = await client.query<TransactionCount>(
      `
        SELECT COUNT(*)::integer AS total
        FROM transactions
        WHERE wallet_id = $1
          AND created_at >= (
            date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE $2)
            AT TIME ZONE $2
          )
          AND created_at < (
            (
              date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE $2)
              + INTERVAL '1 month'
            )
            AT TIME ZONE $2
          )
      `,
      [walletId, timezone],
    );

    return result.rows[0].total;
  }

    async countDailyCompletedConversions(
    client: PoolClient,
    walletId: string,
    timezone = "America/Argentina/Buenos_Aires",
  ): Promise<number> {
    const result = await client.query<TransactionCount>(
      `
        SELECT COUNT(*)::integer AS total
        FROM transactions
        WHERE wallet_id = $1
          AND type = 'conversion'
          AND status = 'completed'
          AND completed_at >= (
            date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE $2)
            AT TIME ZONE $2
          )
          AND completed_at < (
            (
              date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE $2)
              + INTERVAL '1 day'
            )
            AT TIME ZONE $2
          )
      `,
      [walletId, timezone],
    );

    return result.rows[0].total;
  }

    async findExchangeByIdempotencyKey(
    client: PoolClient,
    idempotencyKey: string,
    walletId: string,
  ): Promise<ExchangeRecord | null> {
    const result = await client.query<ExchangeRecord>(
      `
        SELECT
          t.id AS transaction_id,
          t.type,
          t.status,
          t.description,
          t.created_at,
          t.completed_at,
          c.source_currency,
          c.target_currency,
          c.source_amount,
          c.target_amount,
          c.applied_rate,
          c.rate_provider,
          c.rate_fetched_at,
          MAX(m.balance_after)
            FILTER (WHERE b.currency_code = c.source_currency)
              AS source_balance_after,
          MAX(m.balance_after)
            FILTER (WHERE b.currency_code = c.target_currency)
              AS target_balance_after
        FROM transactions AS t
        INNER JOIN conversions AS c
          ON c.transaction_id = t.id
        INNER JOIN movements AS m
          ON m.transaction_id = t.id
        INNER JOIN balances AS b
          ON b.id = m.balance_id
        WHERE t.idempotency_key = $1
          AND t.wallet_id = $2
          AND t.type IN ('purchase', 'sale', 'conversion')
        GROUP BY
          t.id,
          t.type,
          t.status,
          t.description,
          t.created_at,
          t.completed_at,
          c.source_currency,
          c.target_currency,
          c.source_amount,
          c.target_amount,
          c.applied_rate,
          c.rate_provider,
          c.rate_fetched_at
      `,
            [idempotencyKey, walletId],
    );

    return result.rows[0] ?? null;
  }

  async findDestinationWallet(
    client: PoolClient,
    destinationType: "alias" | "accountNumber",
    destinationValue: string,
  ): Promise<TransferDestinationWallet | null> {
    const column =
      destinationType === "alias"
        ? "alias"
        : "account_number";

    const result =
      await client.query<TransferDestinationWallet>(
        `
          SELECT
            id,
            user_id,
            alias,
            account_number,
            status
          FROM wallets
          WHERE ${column} = $1
        `,
        [destinationValue],
      );

    return result.rows[0] ?? null;
  }

    async findTransferBalancesForUpdate(
    client: PoolClient,
    walletIds: [string, string],
    currency: string,
  ): Promise<TransferBalance[]> {
    const result = await client.query<TransferBalance>(
      `
        SELECT
          id,
          wallet_id,
          amount
        FROM balances
        WHERE wallet_id = ANY($1::uuid[])
          AND currency_code = $2
        ORDER BY wallet_id
        FOR UPDATE
      `,
      [walletIds, currency],
    );

    return result.rows;
  }

    async findInternalTransferByIdempotencyKey(
    client: PoolClient,
    idempotencyKey: string,
    sourceWalletId: string,
  ): Promise<InternalTransferRecord | null> {
    const result = await client.query<InternalTransferRecord>(
      `
        SELECT
          t.id AS transaction_id,
          t.status,
          tr.destination_wallet_id,
          destination_wallet.alias AS destination_alias,
          tr.currency_code AS currency,
          tr.amount,
          debit_movement.balance_after
            AS source_balance_after,
          credit_movement.balance_after
            AS destination_balance_after,
          t.created_at
        FROM transactions AS t
        INNER JOIN transfers AS tr
          ON tr.transaction_id = t.id
        INNER JOIN wallets AS destination_wallet
          ON destination_wallet.id =
             tr.destination_wallet_id
        INNER JOIN movements AS debit_movement
          ON debit_movement.transaction_id = t.id
         AND debit_movement.direction = 'debit'
         AND debit_movement.concept = 'principal'
        INNER JOIN movements AS credit_movement
          ON credit_movement.transaction_id = t.id
         AND credit_movement.direction = 'credit'
         AND credit_movement.concept = 'principal'
        WHERE t.idempotency_key = $1
          AND t.wallet_id = $2
          AND t.type = 'transfer'
          AND tr.destination_type = 'internal'
        LIMIT 1
      `,
      [idempotencyKey, sourceWalletId],
    );

    return result.rows[0] ?? null;
  }

    async countDailyExchangeOperations(
    client: PoolClient,
    walletId: string,
    timezone = "America/Argentina/Buenos_Aires",
  ): Promise<number> {
    const result = await client.query<TransactionCount>(
      `
        SELECT COUNT(*)::integer AS total
        FROM transactions
        WHERE wallet_id = $1
          AND type IN ('purchase', 'sale', 'conversion')
          AND status = 'completed'
          AND completed_at >= (
            date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE $2)
            AT TIME ZONE $2
          )
          AND completed_at < (
            (
              date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE $2)
              + INTERVAL '1 day'
            )
            AT TIME ZONE $2
          )
      `,
      [walletId, timezone],
    );

    return result.rows[0].total;
  }

      async createExchangeTransaction(
    client: PoolClient,
    walletId: string,
    idempotencyKey: string,
    type: "purchase" | "sale" | "conversion",
    description: string,
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
        VALUES ($1, $2, 'completed', $3, $4, CURRENT_TIMESTAMP)
        RETURNING id
      `,
      [walletId, type, description, idempotencyKey],
    );

    return result.rows[0].id;
  }

  async createTransferTransaction(
    client: PoolClient,
    sourceWalletId: string,
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
        VALUES (
          $1,
          'transfer',
          'completed',
          $2,
          $3,
          CURRENT_TIMESTAMP
        )
        RETURNING id
      `,
      [
        sourceWalletId,
        "Transferencia interna",
        idempotencyKey,
      ],
    );

    return result.rows[0].id;
  }

    async createConversion(
    client: PoolClient,
    transactionId: string,
    sourceCurrency: string,
    targetCurrency: string,
    sourceAmount: string,
    appliedRate: string,
    rateProvider: string,
    rateFetchedAt: Date,
  ): Promise<string> {
    const result = await client.query<{ target_amount: string }>(
      `
        INSERT INTO conversions (
          transaction_id,
          source_currency,
          target_currency,
          source_amount,
          target_amount,
          applied_rate,
          rate_provider,
          rate_fetched_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          ROUND($4::numeric * $5, 8),
          $5,
          $6,
          $7
        )
        RETURNING target_amount
      `,
      [
        transactionId,
        sourceCurrency,
        targetCurrency,
        sourceAmount,
        appliedRate,
        rateProvider,
        rateFetchedAt,
      ],
    );

        return result.rows[0].target_amount;
  }

  async createInternalTransferDetail(
    client: PoolClient,
    transactionId: string,
    destinationWalletId: string,
    currency: string,
    amount: string,
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO transfers (
          transaction_id,
          destination_type,
          destination_wallet_id,
          currency_code,
          amount
        )
        VALUES (
          $1,
          'internal',
          $2,
          $3,
          $4
        )
      `,
      [
        transactionId,
        destinationWalletId,
        currency,
        amount,
      ],
    );
  }

    async decreaseBalance(
    client: PoolClient,
    balanceId: string,
    amount: string,
  ): Promise<string | null> {
    const result = await client.query<{ amount: string }>(
      `
        UPDATE balances
        SET
          amount = amount - $2::numeric,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND amount >= $2::numeric
        RETURNING amount
      `,
      [balanceId, amount],
    );

    return result.rows[0]?.amount ?? null;
  }

    async createDebitMovement(
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
        VALUES (
          $1,
          $2,
          'debit',
          'principal',
          $3,
          $4,
          $5
        )
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
