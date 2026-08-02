import { PoolClient } from "pg";

export type UserType = "person" | "company";

type UpdateUserTypeParams = {
  firebaseUid: string;
  userType: UserType;
};

type UpdateWalletAliasParams = {
  userId: string;
  alias: string;
};

type CreatePersonProfileParams = {
  userId: string;
  firstName: string;
  lastName: string;
  document: string;
  phone: string;
};

type CreateCompanyProfileParams = {
  userId: string;
  legalName: string;
  document: string;
  phone: string;
};

export async function updateUserType(
  client: PoolClient,
  { firebaseUid, userType }: UpdateUserTypeParams,
) {
  const { rows } = await client.query(
    `
      UPDATE users
      SET user_type = $1
      WHERE firebase_uid = $2
      RETURNING *
    `,
    [userType, firebaseUid],
  );

  return rows[0];
}

export async function updateWalletAlias(
  client: PoolClient,
  { userId, alias }: UpdateWalletAliasParams,
) {
  const { rows } = await client.query(
    `
      UPDATE wallets
      SET alias = $1
      WHERE user_id = $2
      RETURNING *
    `,
    [alias, userId],
  );

  return rows[0];
}

export async function createPersonProfile(
  client: PoolClient,
  {
    userId,
    firstName,
    lastName,
    document,
    phone,
  }: CreatePersonProfileParams,
) {
  const { rows } = await client.query(
    `
      INSERT INTO person_profiles (
        user_id,
        first_name,
        last_name,
        document,
        phone
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [userId, firstName, lastName, document, phone],
  );

  return rows[0];
}

export async function createCompanyProfile(
  client: PoolClient,
  {
    userId,
    legalName,
    document,
    phone,
  }: CreateCompanyProfileParams,
) {
  const { rows } = await client.query(
    `
      INSERT INTO company_profiles (
        user_id,
        legal_name,
        document,
        phone
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [userId, legalName, document, phone],
  );

  return rows[0];
}