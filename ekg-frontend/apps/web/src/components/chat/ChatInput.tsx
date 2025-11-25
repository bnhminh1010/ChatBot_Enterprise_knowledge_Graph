import { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSendMessage, isLoading = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '56px';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const textarea = e.target;
    textarea.style.height = '56px';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
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
            style={{ minHeight: '56px', maxHeight: '200px' }}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || isLoading}
            className={`absolute right-3 bottom-3 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
              !message.trim() || isLoading
                ? 'bg-muted cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90'
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
