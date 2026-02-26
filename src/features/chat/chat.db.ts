import { Database } from "bun:sqlite";
import { randomUUID } from "crypto";
import type { Message, SessionState } from "./chat.types";

const db = new Database("chat.db");

export function insertMessage(
  conversation_id: string,
  role: "user" | "assistant",
  content: string,
): void {
  db.query(
    `INSERT INTO messages (id, conversation_id, role, content)
     VALUES (?, ?, ?, ?)`,
  ).run(randomUUID(), conversation_id, role, content);
}

export function getMessages(conversation_id: string): Message[] {
  return db
    .query<Message, string>(
      `SELECT * FROM messages WHERE conversation_id = ?
       ORDER BY created_at ASC`,
    )
    .all(conversation_id);
}

export function getSessionState(conversation_id: string): SessionState | null {
  const row = db
    .query<any, string>(`SELECT * FROM session_state WHERE conversation_id = ?`)
    .get(conversation_id);

  if (!row) return null;

  return {
    conversation_id: row.conversation_id,
    summary_text: row.summary_text,
    raw_buffer: JSON.parse(row.raw_buffer),
    token_estimate: row.token_estimate,
  };
}

export function upsertSessionState(state: SessionState): void {
  db.query(
    `INSERT INTO session_state (conversation_id, summary_text, raw_buffer, token_estimate)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(conversation_id)
     DO UPDATE SET
       summary_text = excluded.summary_text,
       raw_buffer = excluded.raw_buffer,
       token_estimate = excluded.token_estimate,
       updated_at = CURRENT_TIMESTAMP`,
  ).run(
    state.conversation_id,
    state.summary_text,
    JSON.stringify(state.raw_buffer),
    state.token_estimate,
  );
}
