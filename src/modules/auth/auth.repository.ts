import { PoolClient } from "pg";
import crypto from "node:crypto";

export type User = {
  id: string;
  firebase_uid: string;
  email: string;
  user_type: "person" | "company" | null;
  display_currency: string;
  status: "active" | "inactive" | "blocked";
  created_at: Date;
  last_access_at: Date | null;
};

export type Wallet = {
  id: string;
  user_id: string;
  alias: string;
  account_number: string;
  status: "active" | "inactive" | "blocked";
  created_at: Date;
};

type CreateUserParams = {
  firebaseUid: string;
  email: string;
};

export async function findUserByFirebaseUid(
  client: PoolClient,
  firebaseUid: string,
): Promise<User | null> {
  const { rows } = await client.query<User>(
    `
      SELECT *
      FROM users
      WHERE firebase_uid = $1
    `,
    [firebaseUid],
  );

  return rows[0] ?? null;
}

export async function findWalletByUserId(
  client: PoolClient,
  userId: string,
): Promise<Wallet | null> {
  const { rows } = await client.query<Wallet>(
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
    [userId],
  );

  return rows[0] ?? null;
}

export async function createUser(
  client: PoolClient,
  { firebaseUid, email }: CreateUserParams,
): Promise<User> {
  const { rows } = await client.query<User>(
    `
      INSERT INTO users (
        firebase_uid,
        email
      )
      VALUES ($1, $2)
      RETURNING *
    `,
    [firebaseUid, email],
  );

  return rows[0];
}

type CreateWalletParams = {
  userId: string;
  firebaseUid: string;
};

export async function createWallet(
  client: PoolClient,
  { userId, firebaseUid }: CreateWalletParams,
) {
  const alias = `glb-${firebaseUid.substring(0, 8)}`;

  const accountNumber = `GLB-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

  const { rows } = await client.query(
    `
      INSERT INTO wallets (
        user_id,
        alias,
        account_number
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [userId, alias, accountNumber],
  );

  return rows[0];
}

export async function createInitialBalances(
  client: PoolClient,
  walletId: string,
) {
  await client.query(
    `
      INSERT INTO balances (wallet_id, currency_code)
      VALUES
        ($1,'ARS'),
        ($1,'USD'),
        ($1,'EUR')
    `,
    [walletId],
  );
}