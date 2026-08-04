import { pool } from "../../db/pool";
import {
  createInitialBalances,
  createUser,
  createWallet,
  findUserByFirebaseUid,
  updateLastAccess,
} from "./auth.repository";
import { AuthenticatedUser } from "../../types/authenticated-user";


export async function syncUser(firebaseUser: AuthenticatedUser) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const user = await findUserByFirebaseUid(
      client,
      firebaseUser.uid,
    );

    if (user) {
  const updatedUser = await updateLastAccess(
    client,
    firebaseUser.uid,
  );

  await client.query("COMMIT");

  return updatedUser;
}

    const newUser = await createUser(client, {
    firebaseUid: firebaseUser.uid,
    email: firebaseUser.email,
    });

    const wallet = await createWallet(client, {
    userId: newUser.id,
    firebaseUid: firebaseUser.uid,
    });

    await createInitialBalances(client, wallet.id);

    await client.query("COMMIT");

    return {
    user: newUser,
    wallet,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}