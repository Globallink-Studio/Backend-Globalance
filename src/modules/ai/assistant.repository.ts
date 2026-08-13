import { pool } from "../../db/pool";

export type AssistantMessageRole = "user" | "assistant";

export interface AssistantMessage {
  id: string;
  user_id: string;
  role: AssistantMessageRole;
  content: string;
  created_at: Date;
}

export async function insertAssistantMessage(
  userId: string,
  role: AssistantMessageRole,
  content: string,
): Promise<void> {
  await pool.query(
    `
      INSERT INTO assistant_messages (user_id, role, content)
      VALUES ($1, $2, $3)
    `,
    [userId, role, content],
  );
}

export async function findRecentAssistantMessages(
  userId: string,
  limit: number,
): Promise<AssistantMessage[]> {
  const result = await pool.query<AssistantMessage>(
    `
      SELECT id, user_id, role, content, created_at
      FROM (
        SELECT id, user_id, role, content, created_at
        FROM assistant_messages
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      ) AS recent
      ORDER BY created_at ASC
    `,
    [userId, limit],
  );

  return result.rows;
}

export async function deleteAssistantMessagesOlderThan(
  userId: string,
  days: number,
): Promise<void> {
  await pool.query(
    `
      DELETE FROM assistant_messages
      WHERE user_id = $1
        AND created_at < CURRENT_TIMESTAMP - ($2::int * INTERVAL '1 day')
    `,
    [userId, days],
  );
}
