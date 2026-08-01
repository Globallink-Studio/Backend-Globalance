import { pool } from "../../db/pool";

export interface UserWithProfile {
  id: string;
  firebase_uid: string;
  email: string;
  user_type: "person" | "company";
  display_currency: string;
  status: "active" | "inactive" | "blocked";
  created_at: Date;
  last_access_at: Date | null;
  first_name: string | null;
  last_name: string | null;
  legal_name: string | null;
  document: string | null;
  phone: string | null;
}

export class UserRepository {
  async findById(id: string): Promise<UserWithProfile | null> {
    const result = await pool.query<UserWithProfile>(
      `
        SELECT
          u.id,
          u.firebase_uid,
          u.email,
          u.user_type,
          u.display_currency,
          u.status,
          u.created_at,
          u.last_access_at,
          pp.first_name,
          pp.last_name,
          cp.legal_name,
          COALESCE(pp.document, cp.document) AS document,
          COALESCE(pp.phone, cp.phone) AS phone
        FROM users u
        LEFT JOIN person_profiles pp
          ON pp.user_id = u.id
        LEFT JOIN company_profiles cp
          ON cp.user_id = u.id
        WHERE u.id = $1
      `,
      [id]
    );

    return result.rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<UserWithProfile | null> {
    const result = await pool.query<UserWithProfile>(
      `
        SELECT
          u.id,
          u.firebase_uid,
          u.email,
          u.user_type,
          u.display_currency,
          u.status,
          u.created_at,
          u.last_access_at,
          pp.first_name,
          pp.last_name,
          cp.legal_name,
          COALESCE(pp.document, cp.document) AS document,
          COALESCE(pp.phone, cp.phone) AS phone
        FROM users u
        LEFT JOIN person_profiles pp
          ON pp.user_id = u.id
        LEFT JOIN company_profiles cp
          ON cp.user_id = u.id
        WHERE u.email = $1
      `,
      [email]
    );

    return result.rows[0] ?? null;
  }

  async updateLastAccess(id: string): Promise<void> {
    await pool.query(
      `
        UPDATE users
        SET last_access_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [id]
    );
  }
}