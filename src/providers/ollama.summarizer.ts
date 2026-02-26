/**
 * Conversation summarization service using Ollama
 * Used for compressing chat history
 */

/**
 * Message format for raw conversation buffer
 */
export interface RawMessage {
  role: string;
  content: string;
}

/**
 * Configuration for Ollama summarizer
 */
export interface OllamaSummarizerConfig {
  apiUrl: string;
  modelName: string;
}

/**
 * Summarize a conversation using Ollama
 */
export async function summarizeConversation(
  previousSummary: string,
  rawBuffer: RawMessage[],
  config?: OllamaSummarizerConfig,
): Promise<string> {
  // Use provided config or fall back to environment variables
  const apiUrl =
    config?.apiUrl || process.env.LLAMA_API || "http://localhost:11434";
  const modelName = config?.modelName || process.env.MODEL_NAME || "llama2";

  const combined = `
PREVIOUS SUMMARY:
${previousSummary}

NEW MESSAGES:
${rawBuffer.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

Compress the above.
Preserve facts and emotional progression.
Do not add interpretation.
  `.trim();

  const res = await fetch(`${apiUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelName,
      prompt: combined,
      stream: false,
    }),
  });

  const data = (await res.json()) as { response: string };
  return data.response;
}
