/**
 * Memory mutation handling
 * Validation, application, and filesystem updates
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export interface MemoryMutation {
  action: "create" | "update";
  file: string;
  changes: {
    append?: string;
    add_alias?: string;
    add_role?: string;
  };
}

/**
 * Validates and parses a memory mutation from JSON payload
 * Throws if validation fails
 */
export function validateMemoryMutation(payload: unknown): MemoryMutation {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Mutation must be a JSON object");
  }

  const obj = payload as Record<string, unknown>;

  if (!["create", "update"].includes(obj.action as string)) {
    throw new Error('Action must be "create" or "update"');
  }

  if (typeof obj.file !== "string" || !obj.file.match(/^[a-z0-9_]+$/)) {
    throw new Error(
      "File must be a valid identifier (lowercase alphanumeric + underscore)",
    );
  }

  if (typeof obj.changes !== "object" || obj.changes === null) {
    throw new Error("Changes must be an object");
  }

  const changes = obj.changes as Record<string, unknown>;
  for (const key of Object.keys(changes)) {
    if (!["append", "add_alias", "add_role"].includes(key)) {
      throw new Error(
        `Invalid change key: ${key}. Must be append, add_alias, or add_role`,
      );
    }
    if (typeof changes[key] !== "string") {
      throw new Error(`${key} must be a string`);
    }
  }

  return {
    action: obj.action as "create" | "update",
    file: obj.file as string,
    changes: {
      append: changes.append as string | undefined,
      add_alias: changes.add_alias as string | undefined,
      add_role: changes.add_role as string | undefined,
    },
  };
}

/**
 * Applies a validated mutation to the filesystem
 * Creates new files or updates existing ones
 */
export function applyMemoryMutation(
  mutation: MemoryMutation,
  memoryDir: string = "./memory",
): void {
  const filePath = join(memoryDir, `${mutation.file}.md`);
  let content = "";

  if (mutation.action === "update") {
    // File must exist for update
    content = readFileSync(filePath, "utf-8");
  } else {
    // Create: Initialize with basic frontmatter
    content = `---
id: ${mutation.file}
type: 
aliases: []
roles: []
---

`;
  }

  // Apply changes to existing content
  let currentContent = content;

  if (mutation.changes.append) {
    currentContent += `\n${mutation.changes.append}`;
  }

  if (mutation.changes.add_alias) {
    currentContent = addFrontmatterField(
      currentContent,
      "aliases",
      mutation.changes.add_alias,
    );
  }

  if (mutation.changes.add_role) {
    currentContent = addFrontmatterField(
      currentContent,
      "roles",
      mutation.changes.add_role,
    );
  }

  writeFileSync(filePath, currentContent, "utf-8");
  console.info(`Applied mutation: ${mutation.action} ${mutation.file}`);
}

/**
 * Adds or updates a frontmatter field (aliases or roles)
 * Merges with existing values
 */
function addFrontmatterField(
  content: string,
  field: "aliases" | "roles",
  newValue: string,
): string {
  if (!content.startsWith("---")) {
    return content;
  }

  const endIdx = content.indexOf("---", 3);
  if (endIdx === -1) return content;

  const frontmatter = content.substring(3, endIdx).trim();
  const body = content.substring(endIdx + 3);

  const lines = frontmatter.split("\n");
  let updated = false;

  const newLines = lines.map((line) => {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) return line;

    const key = line.slice(0, colonIdx).trim().toLowerCase();
    if (key === field) {
      // Parse existing array and add new item
      const value = line.slice(colonIdx + 1).trim();
      const cleanValue = value.replace(/^\[(.*)\]$/, "$1");
      const items = cleanValue
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      // Add new value if not already present
      const newItems = newValue
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const item of newItems) {
        if (!items.includes(item)) {
          items.push(item);
        }
      }

      updated = true;
      return `${key}: [${items.join(", ")}]`;
    }
    return line;
  });

  if (!updated) {
    // Field doesn't exist, add it
    newLines.push(`${field}: [${newValue}]`);
  }

  return `---\n${newLines.join("\n")}\n---${body}`;
}
