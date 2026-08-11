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

vi.mock("../src/modules/contacts/contacts.repository", () => ({
  ContactsRepository: vi.fn(),
}));

vi.mock("../src/modules/wallets/wallet.repository", () => ({
  WalletRepository: vi.fn(),
}));

import { pool } from "../src/db/pool";
import { findUserByFirebaseUid } from "../src/modules/auth/auth.repository";
import { ContactsRepository } from "../src/modules/contacts/contacts.repository";
import { ContactsService } from "../src/modules/contacts/contacts.service";
import { WalletRepository } from "../src/modules/wallets/wallet.repository";

function createRepositoryMock() {
  return {
    create: vi.fn(),
    findByUserId: vi.fn(),
    findById: vi.fn(),
    delete: vi.fn(),
  };
}

function createWalletRepositoryMock() {
  return {
    findByAlias: vi.fn(),
    findByAccountNumber: vi.fn(),
  };
}

type RepositoryMock = ReturnType<typeof createRepositoryMock>;
type WalletRepositoryMock = ReturnType<typeof createWalletRepositoryMock>;

describe("ContactsService", () => {
  let repositoryMock: RepositoryMock;
  let walletRepositoryMock: WalletRepositoryMock;
  let service: ContactsService;

  beforeEach(() => {
    vi.clearAllMocks();

    repositoryMock = createRepositoryMock();
    walletRepositoryMock = createWalletRepositoryMock();
    service = new ContactsService(
      repositoryMock as unknown as ContactsRepository,
      walletRepositoryMock as unknown as WalletRepository,
    );

    (pool.connect as ReturnType<typeof vi.fn>).mockResolvedValue(
      fakeClient,
    );
    fakeClient.query.mockImplementation(async () => ({ rows: [] }));
    fakeClient.release.mockImplementation(() => undefined);

    vi.mocked(findUserByFirebaseUid).mockResolvedValue({
      id: "u1",
      firebase_uid: "fb1",
      status: "active",
    } as never);
  });

  describe("createContact", () => {
    it("guarda un contacto por alias resolviendo el wallet", async () => {
      const contact = {
        id: "c1",
        user_id: "u1",
        name: "Mamá",
        contact_type: "alias",
        contact_value: "glb.mama",
        contact_wallet_id: "w2",
      };
      walletRepositoryMock.findByAlias.mockResolvedValue({
        id: "w2",
        user_id: "u2",
        alias: "glb.mama",
      });
      repositoryMock.create.mockResolvedValue(contact);

      const result = await service.createContact("fb1", {
        name: "Mamá",
        type: "alias",
        value: "glb.mama",
      });

      expect(result).toBe(contact);
      expect(walletRepositoryMock.findByAlias).toHaveBeenCalledWith(
        "glb.mama",
      );
      expect(repositoryMock.create).toHaveBeenCalledWith({
        userId: "u1",
        name: "Mamá",
        contactType: "alias",
        contactValue: "glb.mama",
        contactWalletId: "w2",
      });
    });

    it("guarda un contacto por número de cuenta", async () => {
      walletRepositoryMock.findByAccountNumber.mockResolvedValue({
        id: "w3",
      });
      repositoryMock.create.mockResolvedValue({ id: "c2" });

      await service.createContact("fb1", {
        name: "Oficina",
        type: "account_number",
        value: "GLB-1A2B3C4D",
      });

      expect(
        walletRepositoryMock.findByAccountNumber,
      ).toHaveBeenCalledWith("GLB-1A2B3C4D");
      expect(repositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contactWalletId: "w3",
        }),
      );
    });

    it("rechaza con 404 si el alias no pertenece a un usuario Globalance", async () => {
      walletRepositoryMock.findByAlias.mockResolvedValue(null);

      await expect(
        service.createContact("fb1", {
          name: "Mamá",
          type: "alias",
          value: "glb.inexistente",
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: "CONTACT_USER_NOT_FOUND",
      });
      expect(repositoryMock.create).not.toHaveBeenCalled();
    });
  });

  describe("listContacts", () => {
    it("devuelve los contactos del usuario", async () => {
      const contacts = [{ id: "c1" }, { id: "c2" }];
      repositoryMock.findByUserId.mockResolvedValue(contacts);

      const result = await service.listContacts("fb1");

      expect(result).toBe(contacts);
      expect(repositoryMock.findByUserId).toHaveBeenCalledWith("u1");
    });
  });

  describe("deleteContact", () => {
    it("elimina un contacto propio", async () => {
      repositoryMock.findById.mockResolvedValue({
        id: "c1",
        user_id: "u1",
      });

      await service.deleteContact("fb1", "c1");

      expect(repositoryMock.delete).toHaveBeenCalledWith("c1");
    });

    it("rechaza con 404 si el contacto es de otro usuario", async () => {
      repositoryMock.findById.mockResolvedValue({
        id: "c1",
        user_id: "u999",
      });

      await expect(
        service.deleteContact("fb1", "c1"),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: "CONTACT_NOT_FOUND",
      });
      expect(repositoryMock.delete).not.toHaveBeenCalled();
    });

    it("rechaza con 404 si el contacto no existe", async () => {
      repositoryMock.findById.mockResolvedValue(null);

      await expect(
        service.deleteContact("fb1", "c1"),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: "CONTACT_NOT_FOUND",
      });
    });
  });
});
