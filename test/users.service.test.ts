import { beforeEach, describe, expect, it, vi } from "vitest";

const { fakeClient } = vi.hoisted(() => ({
  fakeClient: {
    query: vi.fn(),
    release: vi.fn(),
  },
}));

vi.mock("../src/db/pool", () => ({
  pool: { connect: vi.fn() },
}));

vi.mock("../src/modules/auth/auth.repository", () => ({
  findUserByFirebaseUid: vi.fn(),
}));

vi.mock("../src/modules/users/users.repository", () => ({
  findUserWithProfileByFirebaseUid: vi.fn(),
  updateWalletAlias: vi.fn(),
  updateUserDisplayCurrency: vi.fn(),
  updateUserTimezone: vi.fn(),
  updateUserType: vi.fn(),
  updatePersonProfile: vi.fn(),
  updateCompanyProfile: vi.fn(),
  upsertPersonProfile: vi.fn(),
  upsertCompanyProfile: vi.fn(),
}));

import { pool } from "../src/db/pool";
import { findUserByFirebaseUid } from "../src/modules/auth/auth.repository";
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
