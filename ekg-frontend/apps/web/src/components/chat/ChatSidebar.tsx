import { useState, useEffect } from 'react';
import { Plus, MessageSquare, Trash2, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { UserInfo } from './UserInfo';

export interface Chat {
  id: string;
  title: string;
  messages: any[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatSidebarProps {
  chats: Chat[];
  currentChatId: string;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatSidebar({
  chats,
  currentChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  isOpen,
  onClose,
}: ChatSidebarProps) {
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
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
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
                    currentChatId === chat.id ? 'bg-muted/80' : 'hover:bg-muted/50'
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
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-foreground"
              >
                {theme === 'dark' ? (
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
