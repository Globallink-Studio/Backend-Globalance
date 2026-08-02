import { pool } from "../../db/pool";
import { findUserByFirebaseUid } from "./auth.repository";

export async function syncUser(firebaseUid: string) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const user = await findUserByFirebaseUid(client, firebaseUid);

    if (user) {
      await client.query("COMMIT");
      return user;
    }

    // Próximo paso:
    // const newUser = await createUser(...)

    await client.query("COMMIT");

    return null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}