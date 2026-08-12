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
import { WalletRepository } from "../src/modules/wallets/wallet.repository";
import { BalanceRepository } from "../src/modules/balances/balances.repository";
import { deleteUserAccount } from "../src/modules/users/users.service";
import * as usersRepo from "../src/modules/users/users.repository";
import { AppError } from "../src/errors/app-error";

describe("deleteUserAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (pool.connect as ReturnType<typeof vi.fn>).mockResolvedValue(fakeClient);
    fakeClient.query.mockImplementation(async () => ({ rows: [] }));
    fakeClient.release.mockImplementation(() => undefined);
  });

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
