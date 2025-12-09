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
    // Backend returns: { conversations: [...], total: number }
    const response = await apiGet<{
      conversations: Conversation[];
      total: number;
    }>("/chat/conversations");
    return response.conversations || [];
  } catch (error) {
    console.error("Error fetching conversations:", error);
    throw error;
  }
}
/**
 * Lấy chi tiết một conversation
 * Trả về null nếu conversation không tồn tại (404)
 */
export async function getConversation(
  conversationId: string
): Promise<Conversation | null> {
  try {
    const conversation = await apiGet<Conversation>(
      `/chat/conversations/${conversationId}`
    );
    return conversation;
  } catch (error: any) {
    // 404 = conversation chưa được lưu vào Redis, return null
    if (
      error.message?.includes("not found") ||
      error.message?.includes("404")
    ) {
      return null;
    }
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
