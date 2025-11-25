import { useState, useEffect, useCallback } from 'react';
import {
  getUserConversations,
  deleteConversation as deleteConversationAPI,
  Conversation,
} from '@/server/services/conversations';

export interface Chat {
  id: string;
  title: string;
  messages: any[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Custom hook để quản lý danh sách conversations (chat history)
 */
export function useChatHistory() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateUniqueId = () => {
    return `CONV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * Convert Conversation từ backend sang Chat format của UI
   */
  const convertToChat = (conv: Conversation): Chat => {
    return {
      id: conv.id,
      title: conv.title || 'New Chat',
      messages: conv.messages,
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt),
    };
  };

  /**
   * Load conversations từ backend
   */
  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const conversations = await getUserConversations();
      const convertedChats = conversations.map(convertToChat);

      setChats(convertedChats);

      // Nếu chưa có currentChatId, tạo chat mới
      if (convertedChats.length === 0) {
        const newChat = createNewChatLocally();
        setChats([newChat]);
        setCurrentChatId(newChat.id);
      } else {
        // Set current chat là chat mới nhất
        setCurrentChatId(convertedChats[0].id);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Failed to load chat history');

      // Fallback: tạo chat mới nếu load fail
      const newChat = createNewChatLocally();
      setChats([newChat]);
      setCurrentChatId(newChat.id);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Tạo chat mới (local only, sẽ được lưu khi có tin nhắn đầu tiên)
   */
  const createNewChatLocally = (): Chat => {
    return {
      id: generateUniqueId(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  const createNewChat = useCallback(() => {
    const newChat = createNewChatLocally();
    setChats((prev) => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    return newChat.id;
  }, []);

  const selectChat = useCallback((chatId: string) => {
    setCurrentChatId(chatId);
  }, []);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      // Gọi API để xóa từ Redis
      await deleteConversationAPI(chatId);

      // Xóa local
      const filteredChats = chats.filter((chat) => chat.id !== chatId);

      if (filteredChats.length === 0) {
        // Không còn chat nào, tạo mới
        const newChat = createNewChatLocally();
        setChats([newChat]);
        setCurrentChatId(newChat.id);
      } else {
        setChats(filteredChats);
        if (currentChatId === chatId) {
          setCurrentChatId(filteredChats[0].id);
        }
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setError('Failed to delete conversation');
    }
  }, [chats, currentChatId]);

  const updateChatTitle = useCallback((chatId: string, title: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, title: title.slice(0, 50) } : chat
      )
    );
  }, []);

  /**
   * Refresh conversations (gọi lại API)
   */
  const refreshConversations = useCallback(async () => {
    await loadConversations();
  }, [loadConversations]);

  // Load conversations khi component mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    chats,
    currentChatId,
    isLoading,
    error,
    createNewChat,
    selectChat,
    deleteChat,
    updateChatTitle,
    refreshConversations,
    setCurrentChatId, // Export để có thể update từ bên ngoài
  };
}
