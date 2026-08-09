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

type UpdateDisplayCurrencyParams = {
  userId: string;
  displayCurrency: string;
};

export async function updateUserDisplayCurrency(
  client: PoolClient,
  { userId, displayCurrency }: UpdateDisplayCurrencyParams,
) {
  const { rows } = await client.query(
    `
      UPDATE users
      SET display_currency = $1
      WHERE id = $2
      RETURNING *
    `,
    [displayCurrency, userId],
  );

  return rows[0];
}

type UpdateUserTimezoneParams = {
  userId: string;
  timezone: string;
};

export async function updateUserTimezone(
  client: PoolClient,
  { userId, timezone }: UpdateUserTimezoneParams,
) {
  const { rows } = await client.query(
    `
      UPDATE users
      SET timezone = $1
      WHERE id = $2
      RETURNING *
    `,
    [timezone, userId],
  );

  return rows[0];
}

export async function upsertPersonProfile(
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
      ON CONFLICT (user_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name  = EXCLUDED.last_name,
        document   = EXCLUDED.document,
        phone      = EXCLUDED.phone
      RETURNING *
    `,
    [userId, firstName, lastName, document, phone],
  );

  return rows[0];
}

export async function upsertCompanyProfile(
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
      ON CONFLICT (user_id) DO UPDATE SET
        legal_name = EXCLUDED.legal_name,
        document   = EXCLUDED.document,
        phone      = EXCLUDED.phone
      RETURNING *
    `,
    [userId, legalName, document, phone],
  );

  return rows[0];
}

export type UserWithProfile = {
  id: string;
  firebase_uid: string;
  email: string;
  user_type: "person" | "company" | null;
  display_currency: string;
  timezone: string;
  status: "active" | "inactive" | "blocked";
  created_at: Date;
  last_access_at: Date | null;
  first_name: string | null;
  last_name: string | null;
  legal_name: string | null;
  document: string | null;
  phone: string | null;
  alias: string | null;
};

export async function findUserWithProfileByFirebaseUid(
  client: PoolClient,
  firebaseUid: string,
): Promise<UserWithProfile | null> {
  const { rows } = await client.query<UserWithProfile>(
    `
      SELECT
        u.id,
        u.firebase_uid,
        u.email,
        u.user_type,
        u.display_currency,
        u.timezone,
        u.status,
        u.created_at,
        u.last_access_at,
        pp.first_name,
        pp.last_name,
        cp.legal_name,
        COALESCE(pp.document, cp.document) AS document,
        COALESCE(pp.phone, cp.phone) AS phone,
        w.alias
      FROM users u
      LEFT JOIN person_profiles pp
        ON pp.user_id = u.id
      LEFT JOIN company_profiles cp
        ON cp.user_id = u.id
      LEFT JOIN wallets w
        ON w.user_id = u.id
      WHERE u.firebase_uid = $1
    `,
    [firebaseUid],
  );

  return rows[0] ?? null;
}
