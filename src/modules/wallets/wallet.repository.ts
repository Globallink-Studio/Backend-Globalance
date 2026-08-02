import { pool } from "../../db/pool";

export interface Wallet {
  id: string;
  user_id: string;
  alias: string;
  account_number: string;
  status: "active" | "inactive" | "blocked";
  created_at: Date;
}

export class WalletRepository {
  async findById(id: string): Promise<Wallet | null> {
    const result = await pool.query<Wallet>(
      `
        SELECT
          id,
          user_id,
          alias,
          account_number,
          status,
          created_at
        FROM wallets
        WHERE id = $1
      `,
      [id]
    );

    return result.rows[0] ?? null;
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    const result = await pool.query<Wallet>(
      `
        SELECT
          id,
          user_id,
          alias,
          account_number,
          status,
          created_at
        FROM wallets
        WHERE user_id = $1
      `,
      [userId]
    );

    return result.rows[0] ?? null;
  }

  async findByAlias(alias: string): Promise<Wallet | null> {
    const result = await pool.query<Wallet>(
      `
        SELECT
          id,
          user_id,
          alias,
          account_number,
          status,
          created_at
        FROM wallets
        WHERE alias = $1
      `,
      [alias]
    );

    return result.rows[0] ?? null;
  }

  async findByAccountNumber(
    accountNumber: string
  ): Promise<Wallet | null> {
    const result = await pool.query<Wallet>(
      `
        SELECT
          id,
          user_id,
          alias,
          account_number,
          status,
          created_at
        FROM wallets
        WHERE account_number = $1
      `,
      [accountNumber]
    );

    return result.rows[0] ?? null;
  }
}