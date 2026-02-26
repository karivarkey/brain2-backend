/**
 * Memory mutation validation and application
 * Handles filesystem updates for memory files with metadata and data sections
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import type { MemoryMutation } from "../types";

/**
 * Validates and parses a memory mutation from JSON payload
 * Throws if validation fails
 */
export function validateMemoryMutation(payload: unknown): MemoryMutation {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Mutation must be a JSON object");
  }

  const obj = payload as Record<string, unknown>;

  if (!["create", "update", "delete"].includes(obj.action as string)) {
    throw new Error('Action must be "create", "update", or "delete"');
  }

  if (typeof obj.file !== "string" || !obj.file.match(/^[a-z0-9_'-]+$/)) {
    throw new Error(
      "File must be a valid identifier (lowercase alphanumeric, underscore, hyphen, or apostrophe)",
    );
  }

  if (typeof obj.changes !== "object" || obj.changes === null) {
    throw new Error("Changes must be an object");
  }

  const changes = obj.changes as Record<string, unknown>;

  // Validate metadata if present
  if (changes.metadata !== undefined) {
    if (typeof changes.metadata !== "object") {
      throw new Error("Metadata must be an object");
    }
  }

  // Validate append if present
  if (changes.append !== undefined && typeof changes.append !== "string") {
    throw new Error("Append must be a string");
  }

  // Validate delete_lines if present
  if (changes.delete_lines !== undefined) {
    if (!Array.isArray(changes.delete_lines)) {
      throw new Error("delete_lines must be an array of strings");
    }
    if (!changes.delete_lines.every((item) => typeof item === "string")) {
      throw new Error("All items in delete_lines must be strings");
    }
  }

  return {
    action: obj.action as "create" | "update" | "delete",
    file: obj.file as string,
    changes: {
      metadata: changes.metadata as
        | Record<
            string,
            string | number | boolean | string[] | Record<string, unknown>
          >
        | undefined,
      append: changes.append as string | undefined,
      delete_lines: changes.delete_lines as string[] | undefined,
    },
  };
}

/**
 * Applies a validated mutation to the filesystem
 * Creates new files, updates metadata/data, or deletes content
 */
export function applyMemoryMutation(
  mutation: MemoryMutation,
  memoryDir: string = "./memory",
): void {
  const filePath = join(memoryDir, `${mutation.file}.md`);
  let content = "";

  if (mutation.action === "delete") {
    // For delete, we're typically deleting specific lines, not the whole file
    // So treat it like an update
    if (existsSync(filePath)) {
      content = readFileSync(filePath, "utf-8");
    } else {
      console.warn(`File ${filePath} not found for delete operation`);
      return;
    }
  } else if (mutation.action === "update") {
    // Check if file exists
    if (!existsSync(filePath)) {
      console.warn(
        `File ${filePath} does not exist. Auto-converting UPDATE to CREATE.`,
      );
      // Treat as create
      mutation.action = "create";
      content = `---
id: ${mutation.file}
type: 
---

`;
    } else {
      content = readFileSync(filePath, "utf-8");
    }
  } else {
    // Create: Initialize with basic frontmatter
    content = `---
id: ${mutation.file}
type: 
---

`;
  }

  // Apply changes
  let updatedContent = content;

  // 1. Update metadata if provided
  if (mutation.changes.metadata) {
    updatedContent = updateMetadata(updatedContent, mutation.changes.metadata);
  }

  // 2. Delete lines if specified
  if (
    mutation.changes.delete_lines &&
    mutation.changes.delete_lines.length > 0
  ) {
    updatedContent = deleteLines(updatedContent, mutation.changes.delete_lines);
  }

  // 3. Append to data section if provided
  if (mutation.changes.append) {
    updatedContent = appendToData(updatedContent, mutation.changes.append);
  }

  writeFileSync(filePath, updatedContent, "utf-8");
  console.info(`Applied mutation: ${mutation.action} ${mutation.file}`);
}

/**
 * Update or add metadata fields in frontmatter
 */
function updateMetadata(
  content: string,
  metadata: Record<string, unknown>,
): string {
  if (!content.startsWith("---")) {
    // No frontmatter, add it
    const formatted = formatMetadata(metadata);
    return `---\n${formatted}\n---\n\n${content}`;
  }

  const endIdx = content.indexOf("---", 3);
  if (endIdx === -1) {
    // Malformed, append frontmatter at start
    const formatted = formatMetadata(metadata);
    return `---\n${formatted}\n---\n\n${content}`;
  }

  const frontmatterContent = content.substring(3, endIdx).trim();
  const body = content.substring(endIdx + 3);

  const lines = frontmatterContent.split("\n");
  const metadataMap = new Map<string, string>();

  // Parse existing metadata
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    metadataMap.set(key, value);
  }

  // Update with new metadata
  for (const [key, value] of Object.entries(metadata)) {
    metadataMap.set(key, formatMetadataValue(value));
  }

  // Rebuild frontmatter
  const newLines = Array.from(metadataMap.entries()).map(
    ([key, value]) => `${key}: ${value}`,
  );

  return `---\n${newLines.join("\n")}\n---${body}`;
}

/**
 * Format metadata value for YAML
 */
function formatMetadataValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return `[${value.join(", ")}]`;
  }
  if (typeof value === "object") {
    // For nested objects, use YAML-like format
    return JSON.stringify(value).replace(/"/g, "'");
  }
  return String(value);
}

/**
 * Format complete metadata object
 */
function formatMetadata(metadata: Record<string, unknown>): string {
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${formatMetadataValue(value)}`)
    .join("\n");
}

/**
 * Delete lines containing specified text patterns
 */
function deleteLines(content: string, patterns: string[]): string {
  const lines = content.split("\n");

  const filtered = lines.filter((line) => {
    // Don't filter frontmatter
    if (line === "---" || line.startsWith("---")) {
      return true;
    }

    // Check if line matches any delete pattern
    for (const pattern of patterns) {
      if (line.includes(pattern)) {
        return false; // Delete this line
      }
    }

    return true; // Keep this line
  });

  return filtered.join("\n");
}

/**
 * Append content to the data section (after frontmatter)
 */
function appendToData(content: string, append: string): string {
  if (!content.startsWith("---")) {
    return content + "\n\n" + append;
  }

  const endIdx = content.indexOf("---", 3);
  if (endIdx === -1) {
    return content + "\n\n" + append;
  }

  const frontmatter = content.substring(0, endIdx + 3);
  const body = content.substring(endIdx + 3);

  return frontmatter + body + "\n\n" + append;
}
