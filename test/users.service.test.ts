import { beforeEach, describe, expect, it, vi } from "vitest";

const { fakeClient, mockWalletRepositoryInstance, mockBalanceRepositoryInstance } = vi.hoisted(() => ({
  fakeClient: {
    query: vi.fn(),
    release: vi.fn(),
  },
  mockWalletRepositoryInstance: {
    findByUserId: vi.fn(),
  },
  mockBalanceRepositoryInstance: {
    findByWalletId: vi.fn(),
  },
}));

vi.mock("../src/db/pool", () => ({
  pool: { connect: vi.fn() },
}));

vi.mock("../src/modules/auth/auth.repository", () => ({
  findUserByFirebaseUid: vi.fn(),
}));

vi.mock("../src/modules/users/users.repository", () => ({
  deactivateWallet: vi.fn(),
  deleteCompanyProfile: vi.fn(),
  deletePersonProfile: vi.fn(),
  softDeleteUser: vi.fn(),
  findUserWithProfileByFirebaseUid: vi.fn(),
  upsertCompanyProfile: vi.fn(),
  upsertPersonProfile: vi.fn(),
  updateUserDisplayCurrency: vi.fn(),
  updateUserTimezone: vi.fn(),
  updateUserType: vi.fn(),
  updateWalletAlias: vi.fn(),
  updatePersonProfile: vi.fn(),
  updateCompanyProfile: vi.fn(),
}));

vi.mock("../src/config/firebase", () => ({
  auth: {
    deleteUser: vi.fn(),
  },
}));

vi.mock("../src/modules/wallets/wallet.repository", () => {
  return {
    WalletRepository: class {
      findByUserId = mockWalletRepositoryInstance.findByUserId;
    },
  };
});

vi.mock("../src/modules/balances/balances.repository", () => {
  return {
    BalanceRepository: class {
      findByWalletId = mockBalanceRepositoryInstance.findByWalletId;
    },
  };
});

import { pool } from "../src/db/pool";
import { findUserByFirebaseUid } from "../src/modules/auth/auth.repository";
import { auth } from "../src/config/firebase";
import { deleteUserAccount } from "../src/modules/users/users.service";
import * as usersRepo from "../src/modules/users/users.repository";
import { AppError } from "../src/errors/app-error";
import {
  updateWalletAlias,
  updateUserDisplayCurrency,
  updateUserTimezone,
  updateUserType,
  updatePersonProfile,
  updateCompanyProfile,
  upsertPersonProfile,
  upsertCompanyProfile,
} from "../src/modules/users/users.repository";
import {
  completeProfile,
  editProfile,
} from "../src/modules/users/users.service";

function createUser(user_type: "person" | "company" | null) {
  return {
    id: "u1",
    firebase_uid: "fb1",
    email: "manu@globalance.com",
    user_type,
    display_currency: "ARS",
    timezone: "America/Argentina/Buenos_Aires",
    status: "active" as const,
    created_at: new Date(),
    last_access_at: null,
  };
}

const personProfile = {
  userType: "person",
  firstName: "Manuela",
  lastName: "Gómez",
  document: "12345678",
  phone: "+5491123456789",
  alias: "manu.globalance",
  displayCurrency: "ARS",
} as const;

const companyProfile = {
  userType: "company",
  legalName: "Globalance S.A.",
  document: "30123456789",
  phone: "+5491123456789",
  alias: "globalance.empresa",
  displayCurrency: "USD",
} as const;

beforeEach(() => {
  vi.clearAllMocks();

  (pool.connect as ReturnType<typeof vi.fn>).mockResolvedValue(
    fakeClient,
  );
  fakeClient.query.mockImplementation(async () => ({ rows: [] }));
  fakeClient.release.mockImplementation(() => undefined);
});

describe("completeProfile", () => {
  it("rechaza con 404 si el usuario no existe", async () => {
    vi.mocked(findUserByFirebaseUid).mockResolvedValue(null);

    await expect(
      completeProfile("fb1", personProfile),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "USER_NOT_FOUND",
    });
  });

  it("rechaza con 409 si el perfil ya fue completado", async () => {
    vi.mocked(findUserByFirebaseUid).mockResolvedValue(
      createUser("person"),
    );

    await expect(
      completeProfile("fb1", personProfile),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "PROFILE_ALREADY_COMPLETED",
    });

    expect(updateUserType).not.toHaveBeenCalled();
    expect(upsertPersonProfile).not.toHaveBeenCalled();
  });

  it("completa el perfil de persona y commitea", async () => {
    vi.mocked(findUserByFirebaseUid).mockResolvedValue(
      createUser(null),
    );

    const result = await completeProfile("fb1", personProfile);

    expect(result).toEqual({
      message: "Perfil completado correctamente.",
    });
    expect(updateUserType).toHaveBeenCalledWith(fakeClient, {
      firebaseUid: "fb1",
      userType: "person",
    });
    expect(updateWalletAlias).toHaveBeenCalledWith(fakeClient, {
      userId: "u1",
      alias: "manu.globalance",
    });
    expect(upsertPersonProfile).toHaveBeenCalledWith(fakeClient, {
      userId: "u1",
      firstName: "Manuela",
      lastName: "Gómez",
      document: "12345678",
      phone: "+5491123456789",
    });
  });

  it("completa el perfil de empresa y commitea", async () => {
    vi.mocked(findUserByFirebaseUid).mockResolvedValue(
      createUser(null),
    );

    const result = await completeProfile("fb1", companyProfile);

    expect(result).toEqual({
      message: "Perfil completado correctamente.",
    });
    expect(updateUserType).toHaveBeenCalledWith(fakeClient, {
      firebaseUid: "fb1",
      userType: "company",
    });
    expect(upsertCompanyProfile).toHaveBeenCalledWith(fakeClient, {
      userId: "u1",
      legalName: "Globalance S.A.",
      document: "30123456789",
      phone: "+5491123456789",
    });
  });
});

describe("editProfile", () => {
  it("rechaza con 404 si el usuario no existe", async () => {
    vi.mocked(findUserByFirebaseUid).mockResolvedValue(null);

    await expect(
      editProfile("fb1", { firstName: "Nuevo" }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "USER_NOT_FOUND",
    });
  });

  it("rechaza con 409 si el perfil no fue completado", async () => {
    vi.mocked(findUserByFirebaseUid).mockResolvedValue(
      createUser(null),
    );

    await expect(
      editProfile("fb1", { firstName: "Nuevo" }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "PROFILE_NOT_COMPLETED",
    });

    expect(updatePersonProfile).not.toHaveBeenCalled();
    expect(updateWalletAlias).not.toHaveBeenCalled();
  });

  it("actualiza solo los campos enviados y nunca toca el documento", async () => {
    vi.mocked(findUserByFirebaseUid).mockResolvedValue(
      createUser("person"),
    );

    const result = await editProfile("fb1", {
      firstName: "Nueva Manuela",
    });

    expect(result).toEqual({
      message: "Perfil actualizado correctamente.",
    });
    expect(updatePersonProfile).toHaveBeenCalledWith(fakeClient, {
      userId: "u1",
      firstName: "Nueva Manuela",
    });
    expect(upsertPersonProfile).not.toHaveBeenCalled();
  });

  it("actualiza alias, moneda y zona horaria cuando vienen", async () => {
    vi.mocked(findUserByFirebaseUid).mockResolvedValue(
      createUser("person"),
    );

    await editProfile("fb1", {
      alias: "manu.nuevo",
      displayCurrency: "USD",
      timezone: "Europe/Madrid",
    });

    expect(updateWalletAlias).toHaveBeenCalledWith(fakeClient, {
      userId: "u1",
      alias: "manu.nuevo",
    });
    expect(updateUserDisplayCurrency).toHaveBeenCalledWith(fakeClient, {
      userId: "u1",
      displayCurrency: "USD",
    });
    expect(updateUserTimezone).toHaveBeenCalledWith(fakeClient, {
      userId: "u1",
      timezone: "Europe/Madrid",
    });
  });

  it("actualiza el perfil de empresa con legalName y phone", async () => {
    vi.mocked(findUserByFirebaseUid).mockResolvedValue(
      createUser("company"),
    );

    await editProfile("fb1", {
      legalName: "Globalance SA",
      phone: "+5491100000000",
    });

    expect(updateCompanyProfile).toHaveBeenCalledWith(fakeClient, {
      userId: "u1",
      legalName: "Globalance SA",
      phone: "+5491100000000",
    });
  });

  it("no modifica alias, moneda ni timezone si no vienen en los cambios", async () => {
    vi.mocked(findUserByFirebaseUid).mockResolvedValue(
      createUser("person"),
    );

    await editProfile("fb1", { lastName: "Pérez" });

    expect(updateWalletAlias).not.toHaveBeenCalled();
    expect(updateUserDisplayCurrency).not.toHaveBeenCalled();
    expect(updateUserTimezone).not.toHaveBeenCalled();
  });
});

describe("deleteUserAccount", () => {
  it("debería lanzar error si el usuario no existe", async () => {
    vi.mocked(findUserByFirebaseUid).mockResolvedValue(null);

    await expect(deleteUserAccount("non-existent")).rejects.toThrow(
      new AppError(404, "USER_NOT_FOUND", "Usuario no encontrado."),
    );

    expect(auth.deleteUser).not.toHaveBeenCalled();
  });

  it("debería lanzar error si el usuario no está activo", async () => {
    vi.mocked(findUserByFirebaseUid).mockResolvedValue({
      id: "u1",
      firebase_uid: "fb1",
      email: "test@test.com",
      status: "inactive",
    } as any);

    await expect(deleteUserAccount("fb1")).rejects.toThrow(
      new AppError(403, "USER_NOT_ACTIVE", "El usuario no está activo."),
    );

    expect(auth.deleteUser).not.toHaveBeenCalled();
  });

  it("debería lanzar error si la billetera tiene fondos", async () => {
    vi.mocked(findUserByFirebaseUid).mockResolvedValue({
      id: "u1",
      firebase_uid: "fb1",
      email: "test@test.com",
      status: "active",
      user_type: "person",
    } as any);

    mockWalletRepositoryInstance.findByUserId.mockResolvedValue({
      id: "w1",
      user_id: "u1",
      alias: "test-alias",
    });

    mockBalanceRepositoryInstance.findByWalletId.mockResolvedValue([
      { currency_code: "ARS", amount: "100.00" },
      { currency_code: "USD", amount: "0.00" },
    ]);

    await expect(deleteUserAccount("fb1")).rejects.toThrow(
      new AppError(
        400,
        "ACCOUNT_HAS_FUNDS",
        "No podés eliminar tu cuenta si aún tenés saldo en tu billetera.",
      ),
    );

    expect(fakeClient.query).not.toHaveBeenCalledWith("BEGIN");
    expect(auth.deleteUser).not.toHaveBeenCalled();
  });

  it("debería eliminar la cuenta con éxito si todos los balances están en cero", async () => {
    vi.mocked(findUserByFirebaseUid).mockResolvedValue({
      id: "u1",
      firebase_uid: "fb1",
      email: "test@test.com",
      status: "active",
      user_type: "person",
    } as any);

    mockWalletRepositoryInstance.findByUserId.mockResolvedValue({
      id: "w1",
      user_id: "u1",
      alias: "test-alias",
    });

    mockBalanceRepositoryInstance.findByWalletId.mockResolvedValue([
      { currency_code: "ARS", amount: "0.00" },
      { currency_code: "USD", amount: "0.00" },
    ]);

    const result = await deleteUserAccount("fb1");

    expect(result).toEqual({ message: "Cuenta eliminada correctamente." });

    expect(fakeClient.query).toHaveBeenCalledWith("BEGIN");
    expect(usersRepo.deactivateWallet).toHaveBeenCalledWith(fakeClient, "u1");
    expect(usersRepo.deletePersonProfile).toHaveBeenCalledWith(fakeClient, "u1");
    expect(usersRepo.softDeleteUser).toHaveBeenCalledWith(fakeClient, {
      userId: "u1",
      scrambledEmail: "deleted_u1_test@test.com",
    });
    expect(fakeClient.query).toHaveBeenCalledWith("COMMIT");
    expect(auth.deleteUser).toHaveBeenCalledWith("fb1");
  });

  it("debería eliminar la cuenta corporativa con éxito", async () => {
    vi.mocked(findUserByFirebaseUid).mockResolvedValue({
      id: "u1",
      firebase_uid: "fb1",
      email: "test@test.com",
      status: "active",
      user_type: "company",
    } as any);

    mockWalletRepositoryInstance.findByUserId.mockResolvedValue({
      id: "w1",
      user_id: "u1",
      alias: "test-alias",
    });

    mockBalanceRepositoryInstance.findByWalletId.mockResolvedValue([
      { currency_code: "EUR", amount: "0.00" },
    ]);

    const result = await deleteUserAccount("fb1");

    expect(result).toEqual({ message: "Cuenta eliminada correctamente." });

    expect(fakeClient.query).toHaveBeenCalledWith("BEGIN");
    expect(usersRepo.deactivateWallet).toHaveBeenCalledWith(fakeClient, "u1");
    expect(usersRepo.deleteCompanyProfile).toHaveBeenCalledWith(fakeClient, "u1");
    expect(usersRepo.softDeleteUser).toHaveBeenCalledWith(fakeClient, {
      userId: "u1",
      scrambledEmail: "deleted_u1_test@test.com",
    });
    expect(fakeClient.query).toHaveBeenCalledWith("COMMIT");
    expect(auth.deleteUser).toHaveBeenCalledWith("fb1");
  });
});
