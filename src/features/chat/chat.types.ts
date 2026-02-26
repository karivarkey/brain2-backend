export type Role = "user" | "assistant";

export interface Message {
  id: string;
  conversation_id: string;
  role: Role;
  content: string;
  mutations?: MemoryChangeDetail[];
  created_at: string;
}

export interface BufferMessage {
  role: Role;
  content: string;
}

export interface SessionState {
  conversation_id: string;
  summary_text: string;
  raw_buffer: BufferMessage[];
  token_estimate: number;
}

export interface MemoryChangeDetail {
  action: "create" | "update" | "delete";
  file: string;
  summary: string;
}

export interface ChatRequestBody {
  conversation_id: string;
  message: string;
  userId?: string;
  fcmToken?: string;
  timezone?: string;
}

export interface ChatResponse {
  reply: string;
  memoryChanges: MemoryChangeDetail[];
  remindersCreated?: string[];
}
