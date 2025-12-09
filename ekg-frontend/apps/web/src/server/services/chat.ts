import { apiPost } from "@/lib/api-client";

export interface ChatMessageMetadata {
  confidence?: number;
  reasoning?: string[];
  warnings?: string[];
  retrievedDataSources?: string[];
}

export interface ChatMessage {
  message: string;
  response: string;
  queryType: string;
  queryLevel: "simple" | "medium" | "complex" | "agent";
  processingTime: number;
  conversationId?: string;
  timestamp: Date;
  metadata?: ChatMessageMetadata;
  suggestedQuestions?: Array<{
    question: string;
    category: string;
  }>;
}

/**
 * Gửi message tới AI chat endpoint
 */
export async function sendChatMessage(
  message: string,
  conversationId?: string
): Promise<ChatMessage> {
  const response = await apiPost<ChatMessage>("/chat", {
    message,
    conversationId,
  });

  return response;
}

/**
 * Index entities vào ChromaDB (tối ưu semantic search)
 */
export async function indexEntitiesToChroma(): Promise<{ message: string }> {
  const response = await apiPost<{ message: string }>("/chat/index", {});
  return response;
}

/**
 * Check chat system health
 */
export async function checkChatHealth(): Promise<{
  status: string;
  services: Record<string, boolean>;
}> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/chat/health`
  );
  return response.json();
}

/**
 * Gửi message kèm file ảnh tới AI chat endpoint (Vision)
 */
export async function sendChatMessageWithFile(
  message: string,
  file: File,
  conversationId?: string
): Promise<ChatMessage> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("message", message);
  if (conversationId) {
    formData.append("conversationId", conversationId);
  }

  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const response = await fetch(
    `${
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
    }/chat/with-file`,
    {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: `HTTP ${response.status}` }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

/**
 * Gửi message với Sequential Thinking mode
 * AI sẽ suy luận từng bước trước khi trả lời
 */
export async function sendChatMessageWithThinking(
  message: string,
  conversationId?: string
): Promise<ChatMessage> {
  const response = await apiPost<ChatMessage>("/chat/thinking", {
    message,
    conversationId,
  });

  return response;
}
