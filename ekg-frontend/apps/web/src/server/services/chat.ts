import { apiPost } from '@/lib/api-client';

export interface ChatMessage {
  message: string;
  response: string;
  queryType: string;
  queryLevel: 'simple' | 'medium' | 'complex';
  processingTime: number;
  conversationId?: string;
  timestamp: Date;
}

/**
 * Gửi message tới AI chat endpoint
 */
export async function sendChatMessage(
  message: string,
  conversationId?: string
): Promise<ChatMessage> {
  const response = await apiPost<ChatMessage>('/chat', {
    message,
    conversationId,
  });

  return response;
}

/**
 * Index entities vào ChromaDB (tối ưu semantic search)
 */
export async function indexEntitiesToChroma(): Promise<{ message: string }> {
  const response = await apiPost<{ message: string }>('/chat/index', {});
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
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/chat/health`,
  );
  return response.json();
}
