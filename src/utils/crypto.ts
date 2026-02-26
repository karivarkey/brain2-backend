/**
 * Cryptographic utilities
 */

import crypto from "crypto";

/**
 * Calculate SHA-256 hash of a string
 */
export function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}
