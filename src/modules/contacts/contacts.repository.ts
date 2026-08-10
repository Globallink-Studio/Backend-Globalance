import { pool } from "../../db/pool";

export type ContactType = "alias" | "account_number";

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  contact_type: ContactType;
  contact_value: string;
  contact_wallet_id: string;
  created_at: Date;
}

type CreateContactParams = {
  userId: string;
  name: string;
  contactType: ContactType;
  contactValue: string;
  contactWalletId: string;
};

export class ContactsRepository {
  async create(
    params: CreateContactParams,
  ): Promise<Contact> {
    const result = await pool.query<Contact>(
      `
        INSERT INTO frequent_contacts (
          user_id,
          name,
          contact_type,
          contact_value,
          contact_wallet_id
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          user_id,
          name,
          contact_type,
          contact_value,
          contact_wallet_id,
          created_at
      `,
      [
        params.userId,
        params.name,
        params.contactType,
        params.contactValue,
        params.contactWalletId,
      ],
    );

    return result.rows[0];
  }

  async findByUserId(userId: string): Promise<Contact[]> {
    const result = await pool.query<Contact>(
      `
        SELECT
          id,
          user_id,
          name,
          contact_type,
          contact_value,
          contact_wallet_id,
          created_at
        FROM frequent_contacts
        WHERE user_id = $1
        ORDER BY name
      `,
      [userId],
    );

    return result.rows;
  }

  async findById(id: string): Promise<Contact | null> {
    const result = await pool.query<Contact>(
      `
        SELECT
          id,
          user_id,
          name,
          contact_type,
          contact_value,
          contact_wallet_id,
          created_at
        FROM frequent_contacts
        WHERE id = $1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async delete(id: string): Promise<void> {
    await pool.query(
      `
        DELETE FROM frequent_contacts
        WHERE id = $1
      `,
      [id],
    );
  }
}
