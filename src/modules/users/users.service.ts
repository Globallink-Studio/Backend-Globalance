import { pool } from "../../db/pool";
import { AppError } from "../../errors/app-error";
import { findUserByFirebaseUid } from "../auth/auth.repository";
import {
  findUserWithProfileByFirebaseUid,
  createCompanyProfile,
  createPersonProfile,
  updateUserType,
  updateWalletAlias,
  UserType,
} from "./users.repository";

type CompletePersonProfile = {
  userType: "person";
  firstName: string;
  lastName: string;
  document: string;
  phone: string;
  alias: string;
};

type CompleteCompanyProfile = {
  userType: "company";
  legalName: string;
  document: string;
  phone: string;
  alias: string;
};

export type CompleteProfileParams =
  | CompletePersonProfile
  | CompleteCompanyProfile;

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

    await updateUserType(client, {
      firebaseUid,
      userType: profile.userType,
    });

    await updateWalletAlias(client, {
      userId: user.id,
      alias: profile.alias,
    });

    if (profile.userType === "person") {
      await createPersonProfile(client, {
        userId: user.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        document: profile.document,
        phone: profile.phone,
      });
    } else {
      await createCompanyProfile(client, {
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
