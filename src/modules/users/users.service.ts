import { pool } from "../../db/pool";
import { AppError } from "../../errors/app-error";
import { findUserByFirebaseUid } from "../auth/auth.repository";
import { auth } from "../../config/firebase";
import { BalanceRepository } from "../balances/balances.repository";
import { WalletRepository } from "../wallets/wallet.repository";
import {
  findUserWithProfileByFirebaseUid,
  updateCompanyProfile,
  updatePersonProfile,
  updateUserDisplayCurrency,
  updateUserTimezone,
  updateUserType,
  updateWalletAlias,
  upsertCompanyProfile,
  upsertPersonProfile,
  UserType,
  deactivateWallet,
  deleteCompanyProfile,
  deletePersonProfile,
  softDeleteUser,
} from "./users.repository";

type CompletePersonProfile = {
  userType: "person";
  firstName: string;
  lastName: string;
  document: string;
  phone: string;
  alias: string;
  displayCurrency: "ARS" | "USD" | "EUR";
  timezone?: string;
};

type CompleteCompanyProfile = {
  userType: "company";
  legalName: string;
  document: string;
  phone: string;
  alias: string;
  displayCurrency: "ARS" | "USD" | "EUR";
  timezone?: string;
};

export type CompleteProfileParams =
  | CompletePersonProfile
  | CompleteCompanyProfile;

export type EditProfileParams = {
  firstName?: string;
  lastName?: string;
  legalName?: string;
  phone?: string;
  alias?: string;
  displayCurrency?: "ARS" | "USD" | "EUR";
  timezone?: string;
};

export async function completeProfile(
  firebaseUid: string,
  profile: CompleteProfileParams,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const user = await findUserByFirebaseUid(client, firebaseUid);

    if (!user) {
      throw new AppError(
        404,
        "USER_NOT_FOUND",
        "Usuario no encontrado.",
      );
    }

    if (user.user_type) {
      throw new AppError(
        409,
        "PROFILE_ALREADY_COMPLETED",
        "Ya completaste tu perfil. Usá el endpoint de edición para modificarlo.",
      );
    }

    await updateUserType(client, {
      firebaseUid,
      userType: profile.userType,
    });

    await updateWalletAlias(client, {
      userId: user.id,
      alias: profile.alias,
    });

    await updateUserDisplayCurrency(client, {
      userId: user.id,
      displayCurrency: profile.displayCurrency,
    });

    if (profile.timezone) {
      await updateUserTimezone(client, {
        userId: user.id,
        timezone: profile.timezone,
      });
    }

    if (profile.userType === "person") {
      await upsertPersonProfile(client, {
        userId: user.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        document: profile.document,
        phone: profile.phone,
      });
    } else {
      await upsertCompanyProfile(client, {
        userId: user.id,
        legalName: profile.legalName,
        document: profile.document,
        phone: profile.phone,
      });
    }

    await client.query("COMMIT");

    return {
      message: "Perfil completado correctamente.",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function editProfile(
  firebaseUid: string,
  changes: EditProfileParams,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const user = await findUserByFirebaseUid(client, firebaseUid);

    if (!user) {
      throw new AppError(
        404,
        "USER_NOT_FOUND",
        "Usuario no encontrado.",
      );
    }

    if (!user.user_type) {
      throw new AppError(
        409,
        "PROFILE_NOT_COMPLETED",
        "Completá tu perfil antes de editarlo.",
      );
    }

    if (changes.alias !== undefined) {
      await updateWalletAlias(client, {
        userId: user.id,
        alias: changes.alias,
      });
    }

    if (changes.displayCurrency !== undefined) {
      await updateUserDisplayCurrency(client, {
        userId: user.id,
        displayCurrency: changes.displayCurrency,
      });
    }

    if (changes.timezone !== undefined) {
      await updateUserTimezone(client, {
        userId: user.id,
        timezone: changes.timezone,
      });
    }

    if (user.user_type === "person") {
      await updatePersonProfile(client, {
        userId: user.id,
        firstName: changes.firstName,
        lastName: changes.lastName,
        phone: changes.phone,
      });
    } else {
      await updateCompanyProfile(client, {
        userId: user.id,
        legalName: changes.legalName,
        phone: changes.phone,
      });
    }

    await client.query("COMMIT");

    return {
      message: "Perfil actualizado correctamente.",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getProfile(firebaseUid: string) {
  const client = await pool.connect();

  try {
    const profile = await findUserWithProfileByFirebaseUid(
      client,
      firebaseUid,
    );

    if (!profile) {
      throw new AppError(
        404,
        "USER_NOT_FOUND",
        "Usuario no encontrado.",
      );
    }

    return profile;
  } finally {
    client.release();
  }
}

const walletRepository = new WalletRepository();
const balanceRepository = new BalanceRepository();

export async function deleteUserAccount(firebaseUid: string) {
  const client = await pool.connect();

  try {
    const user = await findUserByFirebaseUid(client, firebaseUid);
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "Usuario no encontrado.");
    }

    if (user.status !== "active") {
      throw new AppError(403, "USER_NOT_ACTIVE", "El usuario no está activo.");
    }

    const wallet = await walletRepository.findByUserId(user.id);
    if (wallet) {
      const balances = await balanceRepository.findByWalletId(wallet.id);
      const hasFunds = balances.some((b) => Number(b.amount) > 0);
      if (hasFunds) {
        throw new AppError(
          400,
          "ACCOUNT_HAS_FUNDS",
          "No podés eliminar tu cuenta si aún tenés saldo en tu billetera.",
        );
      }
    }

    await client.query("BEGIN");

    if (wallet) {
      await deactivateWallet(client, user.id);
    }

    if (user.user_type === "person") {
      await deletePersonProfile(client, user.id);
    } else if (user.user_type === "company") {
      await deleteCompanyProfile(client, user.id);
    }

    const scrambledEmail = `deleted_${user.id}_${user.email}`;
    await softDeleteUser(client, { userId: user.id, scrambledEmail });

    await client.query("COMMIT");

    await auth.deleteUser(firebaseUid);

    return {
      message: "Cuenta eliminada correctamente.",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
