"use client";

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { useChat, Message } from '@/hooks/use-chat';
import { useChatHistory } from '@/hooks/use-chat-history';
import { useAuth } from '@/contexts/auth-context';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ChatLanding } from './ChatLanding';
import { getConversation } from '@/server/services/conversations';
import { sendChatMessageWithFile, sendChatMessageWithThinking } from '@/server/services/chat';

function ErrorMessage({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry?: () => void;
}) {
  if (!error) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 max-w-xs">
      <span>{error}</span>
      {onRetry && (
        <button onClick={onRetry} className="underline text-sm">
          Thử lại
        </button>
      )}
    </div>
  );
}

export default function Chat() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useAuth();

  // Use custom hooks
  const {
    chats,
    currentChatId,
    createNewChat,
    selectChat,
    deleteChat,
    updateChatTitle,
    setCurrentChatId,
  } = useChatHistory();

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    retryLastMessage,
    clearMessages,
    setMessages,
  } = useChat({ 
    conversationId: currentChatId || undefined,
    // Sync conversationId from backend when it returns a new/existing ID
    onMessageSent: (backendConversationId) => {
      if (backendConversationId && backendConversationId !== currentChatId) {
        setCurrentChatId(backendConversationId);
      }
    }
  });

  // Handle New Chat: tạo chat mới và clear messages hiện tại
  const handleNewChat = () => {
    createNewChat();
    clearMessages();
  };

  // Handle Select Chat: chuyển chat và load messages từ API
  const handleSelectChat = async (chatId: string) => {
    console.log('🔄 handleSelectChat called with:', chatId);
    
    // Nếu đang ở chat này rồi thì không làm gì
    if (chatId === currentChatId) {
      console.log('Already on this chat, skipping');
      return;
    }
    
    selectChat(chatId);
    
    // Clear messages trước khi load
    clearMessages();
    
    // Luôn load từ API (Redis) vì local chats chỉ có metadata, không có messages
    try {
      console.log('📡 Fetching conversation from API:', chatId);
      const conversation = await getConversation(chatId);
      console.log('📥 API response:', conversation);
      
      if (conversation && conversation.messages && conversation.messages.length > 0) {
        const formattedMessages = conversation.messages.map((msg: any, idx: number) => ({
          id: `${chatId}-${idx}`,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          status: 'delivered' as const,
        }));
        console.log('✅ Setting messages:', formattedMessages.length);
        setMessages(formattedMessages);
      } else {
        console.log('⚠️ No messages in conversation');
      }
    } catch (err) {
      console.log('❌ API error, starting fresh:', err);
    }
  };

  type ChatMode = 'chat' | 'vision' | 'document' | 'thinking' | 'research';

  const handleSendMessage = async (content: string, files?: File[], mode?: ChatMode) => {
    // Nếu mode là vision hoặc document và có file
    if ((mode === 'vision' || mode === 'document') && files && files.length > 0) {
      const file = files[0];
      console.log(`📎 ${mode === 'vision' ? 'Image' : 'Document'} attached:`, file.name);
      
      // Add user message
      const tempId = `temp-${Date.now()}`;
      const userMessage: Message = {
        id: tempId,
        role: 'user',
        content: content || `[${mode === 'vision' ? 'Ảnh' : 'File'}: ${file.name}]`,
        timestamp: new Date(),
        status: 'sending',
      };
      setMessages((prev: Message[]) => [...prev, userMessage]);
      
      try {
        // Gọi API với file
        const response = await sendChatMessageWithFile(
          content || (mode === 'vision' 
            ? 'Mô tả chi tiết nội dung trong ảnh này.' 
            : 'Tóm tắt nội dung chính của file này.'),
          file,
          currentChatId || undefined,
        );
        
        // Add assistant response
        const botResponse: Message = {
          id: `${Date.now()}-bot`,
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
          status: 'delivered',
          metadata: { processingTime: response.processingTime },
        };
        
        setMessages((prev: Message[]) => [
          ...prev.filter((m: Message) => m.id !== tempId),
          { ...userMessage, status: 'delivered' as const },
          botResponse,
        ]);
        
      } catch (err) {
        console.error(`${mode} API error:`, err);
        setMessages((prev: Message[]) =>
          prev.map((m: Message) =>
            m.id === tempId ? { ...m, status: 'error' as const } : m
          )
        );
      }
      return;
    }

    // Mode Sequential Thinking (có thể kèm file)
    if (mode === 'thinking') {
      const hasFile = files && files.length > 0;
      console.log('🧠 Sequential Thinking mode:', content, hasFile ? `+ ${files[0].name}` : '');
      
      const tempId = `temp-${Date.now()}`;
      const userMessage: Message = {
        id: tempId,
        role: 'user',
        content: hasFile 
          ? `🧠 ${content || '[Attached file]'}\n📎 ${files[0].name}`
          : `🧠 ${content}`,
        timestamp: new Date(),
        status: 'sending',
      };
      setMessages((prev: Message[]) => [...prev, userMessage]);
      
      try {
        let response;
        
        if (hasFile) {
          // Thinking mode with file - use vision/document endpoint
          // but enhance the message with thinking instructions
          const thinkingPrompt = `[SEQUENTIAL THINKING MODE]\n${content || 'Phân tích chi tiết và suy luận từng bước về nội dung này.'}`;
          response = await sendChatMessageWithFile(
            thinkingPrompt,
            files[0],
            currentChatId || undefined,
          );
        } else {
          // Thinking mode without file - use thinking endpoint
          response = await sendChatMessageWithThinking(
            content,
            currentChatId || undefined,
          );
        }
        
        const botResponse: Message = {
          id: `${Date.now()}-bot`,
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
          status: 'delivered',
          metadata: { processingTime: response.processingTime },
          suggestedQuestions: response.suggestedQuestions,
        };
        
        setMessages((prev: Message[]) => [
          ...prev.filter((m: Message) => m.id !== tempId),
          { ...userMessage, status: 'delivered' as const },
          botResponse,
        ]);
        
      } catch (err) {
        console.error('Thinking API error:', err);
        setMessages((prev: Message[]) =>
          prev.map((m: Message) =>
            m.id === tempId ? { ...m, status: 'error' as const } : m
          )
        );
      }
      return;
    }
    
    // Mode chat thường
    sendMessage(content);

    // Update title nếu là chat mới
    const currentChat = chats.find((c) => c.id === currentChatId);
    if (currentChat && currentChat.title === 'New Chat') {
      updateChatTitle(currentChatId, content);
    }
  };

  const currentChat = chats.find((chat) => chat.id === currentChatId);

  return (
    <div className="flex h-screen">
      <ChatSidebar
        chats={chats}
        currentChatId={currentChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={deleteChat}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {messages.length === 0 ? (
          <ChatLanding onSuggestionClick={handleSendMessage} userName={user?.username || 'Admin'} />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center h-14 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex-1 text-center lg:text-left lg:ml-0 ml-2">
                <h1 className="text-sm font-semibold text-foreground">
                  {currentChat?.title || 'New Chat'}
                </h1>
              </div>
            </div>

            <ChatMessages 
              messages={messages} 
              isLoading={isLoading} 
              onSuggestionClick={handleSendMessage}
            />
          </>
        )}
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>

      <ErrorMessage error={error} onRetry={retryLastMessage} />
    </div>
  );
}
