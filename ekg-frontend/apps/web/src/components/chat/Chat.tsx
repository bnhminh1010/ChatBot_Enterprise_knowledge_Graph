"use client";

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { useChat } from '@/hooks/use-chat';
import { useChatHistory } from '@/hooks/use-chat-history';
import { useAuth } from '@/contexts/auth-context';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ChatLanding } from './ChatLanding';

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
  } = useChatHistory();

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    retryLastMessage,
  } = useChat();

  const handleSendMessage = (content: string) => {
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
        onNewChat={createNewChat}
        onSelectChat={selectChat}
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

            <ChatMessages messages={messages} isLoading={isLoading} />
          </>
        )}
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>

      <ErrorMessage error={error} onRetry={retryLastMessage} />
    </div>
  );
}
