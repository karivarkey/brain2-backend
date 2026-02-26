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

/**
 * Get total number of unique conversations/sessions
 */
export function getTotalSessions(): number {
  const result = db
    .query<
      { count: number },
      []
    >(`SELECT COUNT(DISTINCT conversation_id) as count FROM messages`)
    .get();
  return result?.count || 0;
}

/**
 * Get all unique conversation IDs with their latest message timestamp
 */
export function getAllSessions(): Array<{
  conversation_id: string;
  message_count: number;
  last_message_at: string;
}> {
  return db
    .query<
      {
        conversation_id: string;
        message_count: number;
        last_message_at: string;
      },
      []
    >(
      `SELECT 
        conversation_id,
        COUNT(*) as message_count,
        MAX(created_at) as last_message_at
       FROM messages
       GROUP BY conversation_id
       ORDER BY last_message_at DESC`,
    )
    .all();
}

/**
 * Get the most recent N messages from the latest conversation
 */
export function getLatestSessionMessages(limit: number = 3): {
  conversation_id: string;
  messages: Message[];
} | null {
  // Get the latest conversation ID
  const latestSession = db
    .query<{ conversation_id: string }, []>(
      `SELECT conversation_id 
       FROM messages 
       GROUP BY conversation_id 
       ORDER BY MAX(created_at) DESC 
       LIMIT 1`,
    )
    .get();

  if (!latestSession) {
    return null;
  }

  // Get the recent messages from that conversation
  const messages = db
    .query<Message, [string, number]>(
      `SELECT * FROM messages 
       WHERE conversation_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
    )
    .all(latestSession.conversation_id, limit)
    .reverse(); // Reverse to get chronological order

  return {
    conversation_id: latestSession.conversation_id,
    messages,
  };
}

/**
 * Get recent messages for all sessions
 * Returns the last N messages for each conversation
 */
export function getAllSessionsWithMessages(limit: number = 3): Array<{
  conversation_id: string;
  message_count: number;
  last_message_at: string;
  messages: Message[];
}> {
  // Get all conversation IDs ordered by latest activity
  const sessions = db
    .query<
      {
        conversation_id: string;
        message_count: number;
        last_message_at: string;
      },
      []
    >(
      `SELECT 
        conversation_id,
        COUNT(*) as message_count,
        MAX(created_at) as last_message_at
       FROM messages
       GROUP BY conversation_id
       ORDER BY last_message_at DESC`,
    )
    .all();

  // For each session, get the recent messages
  return sessions.map((session) => {
    const messages = db
      .query<Message, [string, number]>(
        `SELECT * FROM messages 
         WHERE conversation_id = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
      )
      .all(session.conversation_id, limit)
      .reverse(); // Reverse to get chronological order

    return {
      ...session,
      messages,
    };
  });
}
