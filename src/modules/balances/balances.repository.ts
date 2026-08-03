import { pool } from "../../db/pool";

export interface Balance {
  id: string;
  wallet_id: string;
  currency_code: string;
  amount: string;
  updated_at: Date;
}

export class BalanceRepository {
  async findByWalletId(walletId: string): Promise<Balance[]> {
    const result = await pool.query<Balance>(
      `
        SELECT
          id,
          wallet_id,
          currency_code,
          amount,
          updated_at
        FROM balances
        WHERE wallet_id = $1
        ORDER BY currency_code
      `,
      [walletId]
    );

    return result.rows;
  }

  async findByWalletAndCurrency(
    walletId: string,
    currencyCode: string
  ): Promise<Balance | null> {
    const result = await pool.query<Balance>(
      `
        SELECT
          id,
          wallet_id,
          currency_code,
          amount,
          updated_at
        FROM balances
        WHERE wallet_id = $1
          AND currency_code = $2
      `,
      [walletId, currencyCode]
    );

    return result.rows[0] ?? null;
  }
}