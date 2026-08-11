import { pool } from "../../db/pool";
import { AppError } from "../../errors/app-error";
import { findUserByFirebaseUid } from "../auth/auth.repository";
import { WalletRepository } from "../wallets/wallet.repository";
import { Contact, ContactsRepository } from "./contacts.repository";
import type { CreateContactInput } from "./contacts.schema";

export class ContactsService {
  constructor(
    private readonly contactsRepository = new ContactsRepository(),
    private readonly walletRepository = new WalletRepository(),
  ) {}

  async createContact(
    firebaseUid: string,
    input: CreateContactInput,
  ): Promise<Contact> {
    const client = await pool.connect();

    try {
      const user = await findUserByFirebaseUid(client, firebaseUid);

      if (!user) {
        throw new AppError(
          404,
          "USER_NOT_FOUND",
          "Usuario no encontrado.",
        );
      }

      const destinationWallet =
        input.type === "alias"
          ? await this.walletRepository.findByAlias(input.value)
          : await this.walletRepository.findByAccountNumber(
              input.value,
            );

      if (!destinationWallet) {
        throw new AppError(
          404,
          "CONTACT_USER_NOT_FOUND",
          "No existe un usuario Globalance con esos datos.",
        );
      }

      return await this.contactsRepository.create({
        userId: user.id,
        name: input.name,
        contactType: input.type,
        contactValue: input.value,
        contactWalletId: destinationWallet.id,
      });
    } finally {
      client.release();
    }
  }

  async listContacts(firebaseUid: string): Promise<Contact[]> {
    const client = await pool.connect();

    try {
      const user = await findUserByFirebaseUid(client, firebaseUid);

      if (!user) {
        throw new AppError(
          404,
          "USER_NOT_FOUND",
          "Usuario no encontrado.",
        );
      }

      return await this.contactsRepository.findByUserId(user.id);
    } finally {
      client.release();
    }
  }

  async deleteContact(
    firebaseUid: string,
    contactId: string,
  ): Promise<void> {
    const client = await pool.connect();

    try {
      const user = await findUserByFirebaseUid(client, firebaseUid);

      if (!user) {
        throw new AppError(
          404,
          "USER_NOT_FOUND",
          "Usuario no encontrado.",
        );
      }

      const contact = await this.contactsRepository.findById(
        contactId,
      );

      if (!contact || contact.user_id !== user.id) {
        throw new AppError(
          404,
          "CONTACT_NOT_FOUND",
          "Contacto no encontrado.",
        );
      }

      await this.contactsRepository.delete(contactId);
    } finally {
      client.release();
    }
  }
}
