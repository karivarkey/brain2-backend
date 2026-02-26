const LLAMA_API = process.env.LLAMA_API!;
const MODEL_NAME = process.env.MODEL_NAME!;

export async function summarizeConversation(
  previousSummary: string,
  rawBuffer: { role: string; content: string }[],
): Promise<string> {
  const combined = `
PREVIOUS SUMMARY:
${previousSummary}

NEW MESSAGES:
${rawBuffer.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

Compress the above.
Preserve facts and emotional progression.
Do not add interpretation.
  `.trim();

  const res = await fetch(`${LLAMA_API}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL_NAME,
      prompt: combined,
      stream: false,
    }),
  });

  const data = (await res.json()) as { response: string };
  return data.response;
}
