import { useState, useCallback } from "react";
import { sendChatMessage } from "@/server/services/chat";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  status:
    | "loading"
    | "error"
    | "success"
    | "idle"
    | "pending"
    | "sending"
    | "delivered";
}

interface UseChatOptions {
  conversationId?: string;
  onMessageSent?: (conversationId: string) => void;
}

/**
 * Custom hook để quản lý messages trong một conversation
 */
export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const tempId = `temp-${generateUniqueId()}`;
      const userMessage: Message = {
        id: tempId,
        role: "user",
        content: content,
        timestamp: new Date(),
        status: "sending",
      };

      // Thêm tin nhắn của người dùng
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        // Gọi API /chat với conversationId
        const response = await sendChatMessage(content, options.conversationId);

        const botResponse: Message = {
          id: generateUniqueId(),
          role: "assistant",
          content: response.response,
          timestamp: new Date(),
          status: "delivered",
        };

        // Cập nhật tin nhắn đã gửi và thêm phản hồi
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempId),
          { ...userMessage, status: "delivered" },
          botResponse,
        ]);

        // Notify parent về conversationId mới (nếu có callback)
        if (options.onMessageSent && response.conversationId) {
          options.onMessageSent(response.conversationId);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể gửi tin nhắn. Vui lòng thử lại.";
        setError(errorMessage);

        // Đánh dấu tin nhắn lỗi
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, status: "error" as const } : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, options]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const retryLastMessage = useCallback(() => {
    const failedMessage = messages.find((m) => m.status === "error");
    if (failedMessage) {
      // Remove failed message và gửi lại
      setMessages((prev) => prev.filter((m) => m.id !== failedMessage.id));
      sendMessage(failedMessage.content);
    }
  }, [messages, sendMessage]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    retryLastMessage,
    setMessages, // Export để có thể load messages từ history
  };
}
