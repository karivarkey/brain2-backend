/**
 * Type guard utilities for runtime validation
 */

export function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((v) => typeof v === "number");
}

export function isEmbeddingResponse(
  value: unknown,
): value is { embedding: number[] } {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return "embedding" in obj && isNumberArray(obj.embedding);
}
