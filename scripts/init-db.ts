#!/usr/bin/env bun
/**
 * Database initialization script
 * Creates necessary tables for chat.db and memory_index.db
 */

import { Database } from "bun:sqlite";

console.log("🗄️  Initializing databases...\n");

// Initialize chat.db
console.log("📝 Setting up chat.db...");
const chatDb = new Database("chat.db");

chatDb.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    mutations TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_conversation ON messages(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_created_at ON messages(created_at);

  CREATE TABLE IF NOT EXISTS session_state (
    conversation_id TEXT PRIMARY KEY,
    summary_text TEXT NOT NULL DEFAULT '',
    raw_buffer TEXT NOT NULL DEFAULT '[]',
    token_estimate INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    fcm_token TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT DEFAULT '',
    trigger_at TEXT,
    rrule TEXT,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    last_triggered_at TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
  CREATE INDEX IF NOT EXISTS idx_reminders_trigger ON reminders(trigger_at, active);
  CREATE INDEX IF NOT EXISTS idx_reminders_active ON reminders(active);
`);

chatDb.close();
console.log("✅ chat.db initialized successfully\n");

// Initialize memory_index.db
console.log("🧠 Setting up memory_index.db...");
const memoryDb = new Database("memory_index.db");

memoryDb.exec(`
  CREATE TABLE IF NOT EXISTS embeddings (
    id TEXT PRIMARY KEY,
    file TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    hash TEXT NOT NULL,
    vector TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_file ON embeddings(file);
  CREATE INDEX IF NOT EXISTS idx_hash ON embeddings(hash);
`);

memoryDb.close();
console.log("✅ memory_index.db initialized successfully\n");

console.log("🎉 All databases initialized!");
console.log("\nNext steps:");
console.log("  • Run 'bun run embed' to index your memory files");
console.log("  • Start the server with 'bun run index.ts'\n");
