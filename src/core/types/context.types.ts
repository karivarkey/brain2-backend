/**
 * Context-related type definitions
 */

export interface ContextBlock {
  entries: Array<{
    filename: string;
    score: number;
    content: string;
  }>;
}
