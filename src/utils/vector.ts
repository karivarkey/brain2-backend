/**
 * Vector operations and embedding utilities
 */

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return norm === 0 ? vec : vec.map((v) => v / norm);
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      "Cannot calculate similarity: Vectors must have the same length.",
    );
  }

  return a.reduce((sum, val, i) => {
    const bVal = b[i];
    if (bVal === undefined)
      throw new Error("Unexpected missing vector element.");
    return sum + val * bVal;
  }, 0);
}
