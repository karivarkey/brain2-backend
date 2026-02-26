/**
 * SQLite database wrapper for memory embeddings
 * Handles database initialization and queries
 */

import { Database } from "bun:sqlite";

interface DbHashRow {
  hash: string;
}

interface DbVectorRow {
  file: string;
  chunk_index: number;
  vector: string;
}

/**
 * Database layer for storing and querying vector embeddings
 */
export class MemoryDatabase {
  private db: Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initDb();
  }

  private initDb(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id TEXT PRIMARY KEY,
        file TEXT,
        chunk_index INTEGER,
        hash TEXT,
        vector TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_file ON embeddings(file);
    `);
  }

  /**
   * Check if a file's hash exists in the database
   */
  getFileHash(file: string): string | null {
    const query = this.db.query<DbHashRow, { $file: string }>(
      "SELECT hash FROM embeddings WHERE file = $file LIMIT 1",
    );
    const result = query.get({ $file: file });
    return result?.hash || null;
  }

  /**
   * Delete all embeddings for a file
   */
  deleteFile(file: string): void {
    const query = this.db.query<void, { $file: string }>(
      "DELETE FROM embeddings WHERE file = $file",
    );
    query.run({ $file: file });
  }

  /**
   * Insert a vector embedding
   */
  insertVector(params: {
    id: string;
    file: string;
    chunkIndex: number;
    hash: string;
    vector: string;
  }): void {
    const query = this.db.query<
      void,
      { $id: string; $file: string; $idx: number; $hash: string; $vec: string }
    >(`
      INSERT INTO embeddings (id, file, chunk_index, hash, vector)
      VALUES ($id, $file, $idx, $hash, $vec)
    `);

    query.run({
      $id: params.id,
      $file: params.file,
      $idx: params.chunkIndex,
      $hash: params.hash,
      $vec: params.vector,
    });
  }

  /**
   * Get all vectors from the database
   */
  getAllVectors(): DbVectorRow[] {
    const query = this.db.query<DbVectorRow, []>(
      "SELECT file, chunk_index, vector FROM embeddings",
    );
    return query.all();
  }
}
