/**
 * Memory database operations
 * Manages memory files stored in the filesystem
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
} from "fs";
import { join } from "path";
import type {
  MemoryFile,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  MemoryListItem,
} from "./memory.types";

const MEMORY_DIR = "./memory";

/**
 * Parse frontmatter and content from a markdown file
 */
function parseMemoryFile(content: string): {
  metadata: Record<string, any>;
  data: string;
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, data: content };
  }

  const yamlContent = match[1] || "";
  const data = match[2] || "";

  // Simple YAML parser for our use case
  const metadata: Record<string, any> = {};

  if (!yamlContent) {
    return { metadata, data };
  }

  const lines = yamlContent.split("\n");

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value: any = line.slice(colonIndex + 1).trim();

      // Parse arrays
      if (value.startsWith("[") && value.endsWith("]")) {
        value = value
          .slice(1, -1)
          .split(",")
          .map((v: string) => v.trim());
      }
      // Parse numbers
      else if (!isNaN(Number(value)) && value !== "") {
        value = Number(value);
      }
      // Parse booleans
      else if (value === "true") {
        value = true;
      } else if (value === "false") {
        value = false;
      }

      metadata[key] = value;
    }
  }

  return { metadata, data };
}

/**
 * Serialize metadata and content to markdown format with frontmatter
 */
function serializeMemoryFile(
  metadata: Record<string, any>,
  content: string,
): string {
  const metadataLines = Object.entries(metadata).map(([key, value]) => {
    if (Array.isArray(value)) {
      return `${key}: [${value.join(", ")}]`;
    }
    return `${key}: ${value}`;
  });

  return `---\n${metadataLines.join("\n")}\n---\n\n${content}`;
}

/**
 * Get all memory files
 */
export function getAllMemories(): MemoryListItem[] {
  if (!existsSync(MEMORY_DIR)) {
    return [];
  }

  const files = readdirSync(MEMORY_DIR).filter((f) => f.endsWith(".md"));

  return files.map((filename) => {
    const filePath = join(MEMORY_DIR, filename);
    const content = readFileSync(filePath, "utf-8");
    const { metadata, data } = parseMemoryFile(content);
    const stats = statSync(filePath);
    const id = filename.replace(".md", "");

    return {
      id,
      filename,
      type: metadata.type as string | undefined,
      last_updated: metadata.last_updated as string | undefined,
      preview: data.slice(0, 150).replace(/\n/g, " ").trim() + "...",
    };
  });
}

/**
 * Get a single memory file by ID
 */
export function getMemoryById(id: string): MemoryFile | null {
  const filePath = join(MEMORY_DIR, `${id}.md`);

  if (!existsSync(filePath)) {
    return null;
  }

  const content = readFileSync(filePath, "utf-8");
  const { metadata, data } = parseMemoryFile(content);
  const stats = statSync(filePath);

  return {
    id,
    filename: `${id}.md`,
    metadata,
    content: data,
    created_at: stats.birthtime.toISOString(),
    updated_at: stats.mtime.toISOString(),
  };
}

/**
 * Create a new memory file
 */
export function createMemory(request: CreateMemoryRequest): MemoryFile {
  const id = request.filename.replace(".md", "");
  const filePath = join(MEMORY_DIR, `${id}.md`);

  if (existsSync(filePath)) {
    throw new Error(`Memory file ${id} already exists`);
  }

  const metadata = {
    id,
    type: "custom",
    last_updated: new Date().toISOString().slice(0, 10),
    ...request.metadata,
  };

  const fileContent = serializeMemoryFile(metadata, request.content);
  writeFileSync(filePath, fileContent, "utf-8");

  return getMemoryById(id)!;
}

/**
 * Update an existing memory file
 */
export function updateMemory(
  id: string,
  request: UpdateMemoryRequest,
): MemoryFile {
  const filePath = join(MEMORY_DIR, `${id}.md`);

  if (!existsSync(filePath)) {
    throw new Error(`Memory file ${id} not found`);
  }

  const content = readFileSync(filePath, "utf-8");
  let { metadata, data } = parseMemoryFile(content);

  // Update metadata
  if (request.metadata) {
    metadata = { ...metadata, ...request.metadata };
  }

  // Update last_updated
  metadata.last_updated = new Date().toISOString().slice(0, 10);

  // Update content
  if (request.content !== undefined) {
    data = request.content;
  }

  // Append content
  if (request.append) {
    data += request.append;
  }

  // Delete lines
  if (request.delete_lines && request.delete_lines.length > 0) {
    const lines = data.split("\n");
    const filteredLines = lines.filter(
      (line) =>
        !request.delete_lines!.some((pattern) => line.includes(pattern)),
    );
    data = filteredLines.join("\n");
  }

  const fileContent = serializeMemoryFile(metadata, data);
  writeFileSync(filePath, fileContent, "utf-8");

  return getMemoryById(id)!;
}

/**
 * Delete a memory file
 */
export function deleteMemory(id: string): boolean {
  const filePath = join(MEMORY_DIR, `${id}.md`);

  if (!existsSync(filePath)) {
    return false;
  }

  // We don't actually delete, just mark it as deleted
  // Or you can implement actual deletion if preferred
  const content = readFileSync(filePath, "utf-8");
  const { metadata, data } = parseMemoryFile(content);

  metadata.deleted = true;
  metadata.deleted_at = new Date().toISOString().slice(0, 10);

  const fileContent = serializeMemoryFile(metadata, data);
  writeFileSync(filePath, fileContent, "utf-8");

  return true;
}
