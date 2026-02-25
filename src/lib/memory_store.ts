import { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import crypto from "crypto";
import { parseMemoryFile } from "./memory_parser";
// --- Types & Interfaces ---

export interface MemoryConfig {
  memoryDir: string;
  dbPath: string;
  ollamaUrl: string;
  model: string;
  chunkSize: number;
  topK: number;
}

export interface SearchResult {
  file: string;
  score: number;
  chunkIndex: number;
}

export interface FileSearchResult {
  file: string;
  score: number;
}

interface DbHashRow {
  hash: string;
}

interface DbVectorRow {
  file: string;
  chunk_index: number;
  vector: string;
}

// --- Type Guards ---

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((v) => typeof v === "number");
}

function isEmbeddingResponse(value: unknown): value is { embedding: number[] } {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return "embedding" in obj && isNumberArray(obj.embedding);
}

// --- Class Implementation ---

export class MemoryStore {
  private db: Database;
  private config: MemoryConfig;

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = {
      memoryDir: "./memory",
      dbPath: "./memory_index.db",
      ollamaUrl: "http://localhost:11434/api/embeddings",
      model: "qwen3-embedding:0.6b",
      chunkSize: 800,
      topK: 6,
      ...config,
    };

    this.db = new Database(this.config.dbPath);
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

  // --- Internal Utils ---

  private sha256(text: string): string {
    return crypto.createHash("sha256").update(text).digest("hex");
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += this.config.chunkSize) {
      chunks.push(text.slice(i, i + this.config.chunkSize));
    }
    return chunks;
  }

  private async getEmbedding(text: string): Promise<number[]> {
    const res = await fetch(this.config.ollamaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.config.model, prompt: text }),
    });

    if (!res.ok) {
      throw new Error(`Ollama Error: ${res.status} ${res.statusText}`);
    }

    const data: unknown = await res.json();

    // Runtime validation guarantees type safety
    if (!isEmbeddingResponse(data)) {
      throw new Error("Invalid response format from embedding model.");
    }

    return this.normalize(data.embedding);
  }

  private normalize(vec: number[]): number[] {
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    return norm === 0 ? vec : vec.map((v) => v / norm);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(
        "Cannot calculate similarity: Vectors must have the same length.",
      );
    }

    // By checking length above, we safely assert b[i] exists.
    return a.reduce((sum, val, i) => {
      const bVal = b[i];
      if (bVal === undefined)
        throw new Error("Unexpected missing vector element.");
      return sum + val * bVal;
    }, 0);
  }

  // --- Public API ---

  /**
   * Syncs the local filesystem with the database.
   */ async refreshIndex(): Promise<void> {
    const files = readdirSync(this.config.memoryDir).filter((f) =>
      f.endsWith(".md"),
    );

    // Prepare queries using Bun's generics for proper typing
    const checkHashQuery = this.db.query<DbHashRow, { $file: string }>(
      "SELECT hash FROM embeddings WHERE file = $file LIMIT 1",
    );
    const deleteFileQuery = this.db.query<void, { $file: string }>(
      "DELETE FROM embeddings WHERE file = $file",
    );
    const insertVectorQuery = this.db.query<
      void,
      { $id: string; $file: string; $idx: number; $hash: string; $vec: string }
    >(`
      INSERT INTO embeddings (id, file, chunk_index, hash, vector)
      VALUES ($id, $file, $idx, $hash, $vec)
    `);

    for (const file of files) {
      const fullPath = join(this.config.memoryDir, file);
      const content = readFileSync(fullPath, "utf-8");
      const fileHash = this.sha256(content);

      const existing = checkHashQuery.get({ $file: file });

      // If the file hash hasn't changed, skip re-embedding
      if (existing !== null && existing.hash === fileHash) {
        continue;
      }

      deleteFileQuery.run({ $file: file });

      // --- NEW: Parse and construct identity-aware text ---
      const parsed = parseMemoryFile(content);

      const embedText = `
ID: ${parsed.id}
TYPE: ${parsed.type}
ALIASES: ${parsed.aliases.join(", ")}
ROLES: ${parsed.roles.join(", ")}

${parsed.body}
      `.trim();

      // Chunk the enriched text instead of the raw content
      const chunks = this.chunkText(embedText);
      // --------------------------------------------------

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk === undefined) continue;

        const vector = await this.getEmbedding(chunk);

        insertVectorQuery.run({
          $id: `${file}_${i}`,
          $file: file,
          $idx: i,
          $hash: fileHash, // We still use the raw file hash to detect file changes
          $vec: JSON.stringify(vector),
        });
      }
      console.info(`Synced: ${file}`);
    }
  }

  /**
   * Searches the indexed memory for a query string.
   * Returns file-level results with best score per file.
   */
  async search(query: string): Promise<FileSearchResult[]> {
    const queryVec = await this.getEmbedding(query);

    // Bun generics define the exact expected return shape
    const getVectorsQuery = this.db.query<DbVectorRow, []>(
      "SELECT file, chunk_index, vector FROM embeddings",
    );
    const rows = getVectorsQuery.all();

    // Track best score for each file
    const bestScores = new Map<string, number>();

    for (const row of rows) {
      const parsed: unknown = JSON.parse(row.vector);

      // Strict validation of the parsed database content
      if (!isNumberArray(parsed)) {
        throw new Error(
          `Database corruption: Invalid vector format in file ${row.file}`,
        );
      }

      const score = this.cosineSimilarity(queryVec, parsed);
      const existing = bestScores.get(row.file);

      // Keep the best score for this file
      if (!existing || score > existing) {
        bestScores.set(row.file, score);
      }
    }

    // Convert map to array and sort
    return Array.from(bestScores.entries())
      .map(([file, score]) => ({ file, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.topK);
  }
}
