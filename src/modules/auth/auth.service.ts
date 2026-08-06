import { pool } from "../../db/pool";
import {
  createInitialBalances,
  createUser,
  createWallet,
  findUserByFirebaseUid,
  findWalletByUserId,
} from "./auth.repository";
import { AuthenticatedUser } from "../../types/authenticated-user";
import { AppError } from "../../errors/app-error";

export async function syncUser(firebaseUser: AuthenticatedUser) {
  if (!firebaseUser.email) {
    throw new AppError(
      400,
      "EMAIL_REQUIRED",
      "El usuario autenticado no tiene correo electrónico.",
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let user = await findUserByFirebaseUid(
      client,
      firebaseUser.uid,
    );

    let created = false;

    if (!user) {
      user = await createUser(client, {
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
      });

      created = true;
    }

    let wallet = await findWalletByUserId(
      client,
      user.id,
    );

    if (!wallet) {
      const newWallet = await createWallet(client, {
        userId: user.id,
        firebaseUid: firebaseUser.uid,
      });

      await createInitialBalances(client, newWallet.id);

      wallet = newWallet;
    }

    await client.query(
      `
        UPDATE users
        SET last_access_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [user.id],
    );

    await client.query("COMMIT");

    return {
      user,
      wallet,
      created,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
