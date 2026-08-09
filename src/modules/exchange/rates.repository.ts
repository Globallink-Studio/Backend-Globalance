import { pool } from "../../db/pool";

export async function findDisplayCurrencyByFirebaseUid(
  firebaseUid: string,
): Promise<string | null> {
  const { rows } = await pool.query<{ display_currency: string }>(
    `
      SELECT display_currency
      FROM users
      WHERE firebase_uid = $1
    `,
    [firebaseUid],
  );

  return rows[0]?.display_currency ?? null;
}
