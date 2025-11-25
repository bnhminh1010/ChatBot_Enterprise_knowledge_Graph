import { apiGet, apiDelete } from "@/lib/api-client";

/**
 * Interface cho Conversation Message
 */
export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  metadata?: {
    queryType?: string;
    queryLevel?: string;
    processingTime?: number;
  };
}

/**
 * Interface cho Conversation
 */
export interface Conversation {
  id: string;
  userId: string;
  messages: ConversationMessage[];
  createdAt: number;
  updatedAt: number;
  title?: string; // Derived từ first message
}

/**
 * Lấy danh sách conversations của user hiện tại
 */
export async function getUserConversations(): Promise<Conversation[]> {
  try {
    const conversations = await apiGet<Conversation[]>("/chat/conversations");
    return conversations;
  } catch (error) {
    console.error("Error fetching conversations:", error);
    throw error;
  }
}

/**
 * Lấy chi tiết một conversation
 */
export async function getConversation(
  conversationId: string
): Promise<Conversation> {
  try {
    const conversation = await apiGet<Conversation>(
      `/chat/conversations/${conversationId}`
    );
    return conversation;
  } catch (error) {
    console.error(`Error fetching conversation ${conversationId}:`, error);
    throw error;
  }
}

/**
 * Xóa một conversation
 */
export async function deleteConversation(
  conversationId: string
): Promise<{ message: string }> {
  try {
    const result = await apiDelete<{ message: string }>(
      `/chat/conversations/${conversationId}`
    );
    return result;
  } catch (error) {
    console.error(`Error deleting conversation ${conversationId}:`, error);
    throw error;
  }
}
