"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { LogOut, User as UserIcon } from "lucide-react";
const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
import {
  Plus,
  MessageSquare,
  Trash2,
  Moon,
  Sun,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
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

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}
interface ChatMessages {
  messages: Message[];
  isLoading?: boolean;
}
interface ChatInput {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}
function ChatMessages({
  messages,
  isLoading,
}: ChatMessages) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.role === "user"
                  ? "bg-blue-500 text-white rounded-br-none"
                  : "bg-gray-100 dark:bg-gray-700 rounded-bl-none"
              }`}
            >
              {message.content}
              <div className="text-xs opacity-70 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
                {message.status === "sending" && " · Đang gửi..."}
                {message.status === "error" && " · Gửi thất bại"}
              </div>
            </div>
          </div>
        ))}

        {/* Hiển thị khi đang tải */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2 rounded-bl-none">
              <div className="flex space-x-2">
                <div
                  className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

function ChatInput({ onSendMessage, isLoading = false }: ChatInput) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "56px";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const textarea = e.target;
    textarea.style.height = "56px";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
  };

  return (
    <div className="border-t border-border bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Message KhoaOcBo..."
            rows={1}
            className="w-full resize-none rounded-3xl border border-border bg-background px-5 py-4 pr-14 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm hover:shadow-md"
            style={{ minHeight: "56px", maxHeight: "200px" }}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || isLoading}
            className={`absolute right-3 bottom-3 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
              !message.trim() || isLoading
                ? "bg-muted cursor-not-allowed"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          KhoaOcBo can make mistakes. Please double-check responses.
        </p>
      </div>
    </div>
  );
}

function ChatSidebar({
  chats,
  currentChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  isOpen,
  onClose,
}: {
  chats: Chat[];
  currentChatId: string;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed lg:relative z-50 h-full w-[260px] flex-shrink-0 bg-background border-r border-border transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-3 border-b border-border">
            <button
              onClick={onNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors shadow-sm hover:shadow"
            >
              <Plus className="w-4 h-4" />
              <span>New chat</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-3">
            <div className="space-y-0.5">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    onSelectChat(chat.id);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                    currentChatId === chat.id
                      ? "bg-muted/80"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-sm truncate text-foreground">
                    {chat.title}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    className="flex-shrink-0 w-6 h-6 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 flex items-center justify-center transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 border-t border-border space-y-2">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-foreground"
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="w-4 h-4" />
                    <span className="text-sm">Light mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4" />
                    <span className="text-sm">Dark mode</span>
                  </>
                )}
              </button>
            )}

            <UserInfo />
          </div>
        </div>
      </div>
    </>
  );
}

export default function Chat() {
  const [chats, setChats] = useState<Chat[]>([
    {
      id: "1",
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
    },
  ]);
  const [currentChatId, setCurrentChatId] = useState("1");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentChat = chats.find((chat) => chat.id === currentChatId);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>(
    currentChat?.messages || []
  );
  const handleSendMessage = async (content: string) => {
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
      // Gọi API /chat
      const response = await sendChatMessage(content);

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

      // Cập nhật title của chat nếu đó là chat mới
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId && chat.title === "New Chat"
            ? { ...chat, title: content.slice(0, 50) }
            : chat
        )
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Không thể gửi tin nhắn. Vui lòng thử lại.";
      setError(errorMessage);
      // Đánh dấu tin nhắn lỗi
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "error" } : m))
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    const newChat: Chat = {
      id: generateUniqueId(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
    };
    setChats([newChat, ...chats]);
    setCurrentChatId(newChat.id);
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const handleDeleteChat = (chatId: string) => {
    const filteredChats = chats.filter((chat) => chat.id !== chatId);

    if (filteredChats.length === 0) {
      const newChat: Chat = {
        id: generateUniqueId(),
        title: "New Chat",
        messages: [],
        createdAt: new Date(),
      };
      setChats([newChat]);
      setCurrentChatId(newChat.id);
    } else {
      setChats(filteredChats);
      if (currentChatId === chatId) {
        setCurrentChatId(filteredChats[0].id);
      }
    }
  };

  // Trong hàm return của component Chat, thêm component ErrorMessage vào cuối
  return (
    <div className="flex h-screen">
      {/* Sidebar và các phần khác giữ nguyên */}
      <ChatSidebar
        chats={chats}
        currentChatId={currentChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header và các phần khác giữ nguyên */}
        <div className="flex items-center h-14 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center lg:text-left lg:ml-0 ml-2">
            <h1 className="text-sm font-semibold text-foreground">
              {currentChat?.title || "New Chat"}
            </h1>
          </div>
        </div>

        <ChatMessages messages={messages} isLoading={isLoading} />
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>

      {/* Thêm dòng này vào cuối cùng, trước thẻ đóng của thẻ div ngoài cùng */}
      <ErrorMessage
        error={error}
        onRetry={() => {
          const failedMessage = messages.find((m) => m.status === "error");
          if (failedMessage) {
            handleSendMessage(failedMessage.content);
          }
        }}
      />
    </div>
  );
}
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

function UserInfo() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) {
    return null; // Shouldn't happen since page.tsx checks auth
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Get role badge color
  const getRoleBadge = (role: string) => {
    return role === 'ADMIN' 
      ? { text: 'Admin', color: 'bg-gradient-to-br from-purple-500 to-pink-600' }
      : { text: 'Viewer', color: 'bg-gradient-to-br from-blue-500 to-cyan-600' };
  };

  const badge = getRoleBadge(user.role);
  const initials = user.hoTen?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || user.username.slice(0, 2).toUpperCase();

  return (
    <>
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-border">
        <div className={`w-8 h-8 rounded-full ${badge.color} flex items-center justify-center text-white text-xs font-bold shadow`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {user.hoTen || user.username}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {badge.text}
          </p>
        </div>
      </div>

      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <LogOut className="w-4 h-4" />
        <span>{isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
      </button>
    </>
  );
}
