/**
 * Memory store - Main interface for memory indexing and search
 * Combines database, embedding service, and file system operations
 */

import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import type { MemoryConfig, FileSearchResult } from "../types";
import { MemoryDatabase } from "./database";
import { EmbeddingService } from "./embedding.service";
import { parseMemoryFile, buildEmbeddingText } from "./parser";
import {
  sha256,
  chunkText,
  normalizeVector,
  cosineSimilarity,
  isNumberArray,
} from "../../utils";

/**
 * Memory store for indexing and searching memory files with vector embeddings
 */
export class MemoryStore {
  private db: MemoryDatabase;
  private embedder: EmbeddingService;
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

    this.db = new MemoryDatabase(this.config.dbPath);
    this.embedder = new EmbeddingService({
      url: this.config.ollamaUrl,
      model: this.config.model,
    });
  }

  /**
   * Syncs the local filesystem with the database
   * Re-indexes files that have changed
   */
  async refreshIndex(): Promise<void> {
    const files = readdirSync(this.config.memoryDir).filter((f) =>
      f.endsWith(".md"),
    );

    for (const file of files) {
      const fullPath = join(this.config.memoryDir, file);
      const content = readFileSync(fullPath, "utf-8");
      const fileHash = sha256(content);

      const existingHash = this.db.getFileHash(file);

      // If the file hash hasn't changed, skip re-embedding
      if (existingHash !== null && existingHash === fileHash) {
        continue;
      }

      // Delete old embeddings
      this.db.deleteFile(file);

      // Parse and construct identity-aware text
      const parsed = parseMemoryFile(content);
      const embedText = buildEmbeddingText(parsed);

      // Chunk the enriched text instead of the raw content
      const chunks = chunkText(embedText, this.config.chunkSize);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk === undefined) continue;

        const embedding = await this.embedder.getEmbedding(chunk);
        const vector = normalizeVector(embedding);

        this.db.insertVector({
          id: `${file}_${i}`,
          file: file,
          chunkIndex: i,
          hash: fileHash,
          vector: JSON.stringify(vector),
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
    const embedding = await this.embedder.getEmbedding(query);
    const queryVec = normalizeVector(embedding);

    const rows = this.db.getAllVectors();

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

      const score = cosineSimilarity(queryVec, parsed);
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
