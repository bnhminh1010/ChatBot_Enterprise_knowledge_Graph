import { useRef, useEffect } from 'react';
import { MessageContent } from './MessageContent';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status: 'loading' | 'error' | 'success' | 'idle' | 'pending' | 'sending' | 'delivered';
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end message-user' : 'justify-start message-assistant'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-linear-to-r from-[#E6775B] to-[#F0A66B] text-white rounded-br-sm shadow-lg shadow-[#E6775B]/20'
                  : 'bg-card border border-border text-foreground rounded-bl-sm'
              }`}
            >
              <MessageContent content={message.content} role={message.role} />
              <div className="text-xs opacity-70 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
                {message.status === 'sending' && ' · Đang gửi...'}
                {message.status === 'error' && ' · Gửi thất bại'}
              </div>
            </div>
          </div>
        ))}

        {/* Hiển thị khi đang tải */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl px-4 py-3 rounded-bl-sm">
              <div className="flex space-x-2">
                <div
                  className="w-2 h-2 rounded-full bg-[#E6775B] animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-[#F0A66B] animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-[#E6775B] animate-bounce"
                  style={{ animationDelay: '300ms' }}
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
