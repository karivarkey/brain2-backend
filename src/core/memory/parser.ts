/**
 * Memory file parser
 * Parses frontmatter metadata from markdown memory files
 */

import type { MemoryMeta } from "../types";

/**
 * Parse a memory file with YAML-like frontmatter
 * Extracts id, type, aliases, roles, and body content
 */
export function parseMemoryFile(content: string): MemoryMeta {
  const meta: MemoryMeta = {
    id: "",
    type: "",
    aliases: [],
    roles: [],
    body: content.trim(),
  };

  // Check if file starts with frontmatter delimiter
  if (!content.startsWith("---")) {
    return meta;
  }

  // Find the closing delimiter
  const endIdx = content.indexOf("---", 3);
  if (endIdx === -1) {
    // Malformed frontmatter (no closing tag), treat everything as body
    return meta;
  }

  const frontmatter = content.substring(3, endIdx).trim();
  meta.body = content.substring(endIdx + 3).trim();

  const lines = frontmatter.split("\n");

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue; // Skip malformed lines

    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (key === "id") {
      meta.id = value;
    } else if (key === "type") {
      meta.type = value;
    } else if (key === "aliases" || key === "roles") {
      // Handle both `[a, b]` and `a, b` formats safely
      const cleanValue = value.replace(/^\[(.*)\]$/, "$1");
      const arr = cleanValue
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (key === "aliases") meta.aliases = arr;
      if (key === "roles") meta.roles = arr;
    }
  }

  return meta;
}

/**
 * Build rich text representation for embedding
 * Includes metadata fields to improve semantic search
 */
export function buildEmbeddingText(meta: MemoryMeta): string {
  return `
ID: ${meta.id}
TYPE: ${meta.type}
ALIASES: ${meta.aliases.join(", ")}
ROLES: ${meta.roles.join(", ")}

${meta.body}
  `.trim();
}
