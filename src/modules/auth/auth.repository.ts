import { PoolClient } from "pg";

export type User = {
  id: string;
  firebase_uid: string;
  email: string;
  user_type: "person" | "company";
  display_currency: string;
  status: "active" | "inactive" | "blocked";
  created_at: Date;
  last_access_at: Date | null;
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