import { useState, useRef, useEffect } from 'react';
import { Loader2, ChevronDown, Image, FileText, X, MessageSquare, Eye, File, Brain, Plus, Search } from 'lucide-react';

// Available modes
type ChatMode = 'chat' | 'vision' | 'document' | 'thinking' | 'research';

interface ModeConfig {
  id: ChatMode;
  name: string;
  icon: React.ElementType;
  description: string;
  acceptFile?: string;
  comingSoon?: boolean;
}

const MODES: ModeConfig[] = [
  { id: 'chat', name: 'Chat', icon: MessageSquare, description: 'Trò chuyện thông thường' },
  { id: 'vision', name: 'Vision', icon: Eye, description: 'Phân tích ảnh', acceptFile: 'image/*' },
  { id: 'document', name: 'Document', icon: File, description: 'Phân tích file', acceptFile: '.pdf,.doc,.docx,.txt,.csv,.xlsx' },
  { id: 'thinking', name: 'Sequential Thinking', icon: Brain, description: 'Suy luận từng bước' },
  { id: 'research', name: 'Deeper Research', icon: Search, description: 'Nghiên cứu sâu', comingSoon: true },
];

interface AttachedFile {
  id: string;
  file: File;
  preview?: string;
  type: 'image' | 'document';
}

interface ChatInputProps {
  onSendMessage: (message: string, files?: File[], mode?: ChatMode) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSendMessage, isLoading = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [currentMode, setCurrentMode] = useState<ChatMode>('chat');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showThinkingAttach, setShowThinkingAttach] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const thinkingAttachRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowModeMenu(false);
      }
      if (thinkingAttachRef.current && !thinkingAttachRef.current.contains(e.target as Node)) {
        setShowThinkingAttach(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = () => {
    if (message.trim() || attachedFiles.length > 0) {
      const files = attachedFiles.map(af => af.file);
      onSendMessage(message, files.length > 0 ? files : undefined, currentMode);
      setMessage('');
      setAttachedFiles([]);
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

  const handleModeSelect = (mode: ChatMode) => {
    const modeConfig = MODES.find(m => m.id === mode);
    
    // Nếu mode đang phát triển, hiển thị popup
    if (modeConfig?.comingSoon) {
      setShowComingSoon(true);
      setShowModeMenu(false);
      return;
    }
    
    setCurrentMode(mode);
    setShowModeMenu(false);
    setAttachedFiles([]); // Clear files when changing mode
    setShowThinkingAttach(false);
    
    // Auto open file picker for vision/document modes (NOT thinking)
    if (mode === 'vision' || mode === 'document') {
      setTimeout(() => fileInputRef.current?.click(), 100);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: AttachedFile[] = [];
    Array.from(files).forEach((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const isImage = file.type.startsWith('image/');
      
      if (isImage) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setAttachedFiles(prev => [...prev, {
            id,
            file,
            preview: event.target?.result as string,
            type: 'image'
          }]);
        };
        reader.readAsDataURL(file);
      } else {
        newFiles.push({ id, file, type: 'document' });
      }
    });

    if (newFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }
    
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  };

  const currentModeConfig = MODES.find(m => m.id === currentMode)!;
  const ModeIcon = currentModeConfig.icon;

  return (
    <div className="border-t border-border bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachedFiles.map((af) => (
              <div
                key={af.id}
                className="relative group bg-card border border-border rounded-lg p-2 flex items-center gap-2"
              >
                {af.type === 'image' && af.preview ? (
                  <img
                    src={af.preview}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <span className="text-xs text-foreground max-w-[100px] truncate">
                  {af.file.name}
                </span>
                <button
                  onClick={() => removeFile(af.id)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative flex items-stretch gap-3">
          {/* Mode Selector - Dropdown style like the reference image */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowModeMenu(!showModeMenu)}
              className={`h-[60px] px-4 rounded-2xl border bg-card flex items-center gap-2 transition-all ${
                showModeMenu 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50 hover:bg-muted'
              }`}
            >
              <ModeIcon className={`w-5 h-5 ${currentMode !== 'chat' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium text-foreground">{currentModeConfig.name}</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showModeMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Mode Menu Popup */}
            {showModeMenu && (
              <div className="absolute bottom-[70px] left-0 bg-card border border-border rounded-xl shadow-lg py-2 min-w-[200px] z-50">
                {MODES.map((mode) => {
                  const Icon = mode.icon;
                  const isActive = currentMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => handleModeSelect(mode.id)}
                      className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                        isActive 
                          ? 'bg-primary/10 text-primary' 
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <div className="text-sm font-medium">{mode.name}</div>
                        <div className="text-xs text-muted-foreground">{mode.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={currentModeConfig.acceptFile || '*'}
              multiple={currentMode === 'document'}
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Text Input with optional + button for thinking mode */}
          <div className={`flex-1 relative flex items-center rounded-2xl border bg-card transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 ${
            currentMode === 'thinking' ? 'border-primary/50' : 'border-border'
          }`}>
            {/* Attach button for Thinking mode - inside input area */}
            {currentMode === 'thinking' && (
              <div className="relative shrink-0" ref={thinkingAttachRef}>
                <button
                  onClick={() => setShowThinkingAttach(!showThinkingAttach)}
                  className="h-[56px] w-[48px] flex items-center justify-center text-muted-foreground hover:text-primary transition-colors ml-1"
                >
                  <Plus className={`w-5 h-5 transition-transform ${showThinkingAttach ? 'rotate-45 text-primary' : ''}`} />
                </button>
                
                {/* Attach Menu for Thinking mode */}
                {showThinkingAttach && (
                  <div className="absolute bottom-[65px] left-0 bg-card border border-border rounded-xl shadow-lg py-2 min-w-[180px] z-50">
                    <button
                      onClick={() => {
                        fileInputRef.current?.setAttribute('accept', 'image/*');
                        fileInputRef.current?.click();
                        setShowThinkingAttach(false);
                      }}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 text-foreground hover:bg-muted transition-colors"
                    >
                      <Image className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm">Upload ảnh</span>
                    </button>
                    <button
                      onClick={() => {
                        fileInputRef.current?.setAttribute('accept', '.pdf,.doc,.docx,.txt,.csv,.xlsx');
                        fileInputRef.current?.click();
                        setShowThinkingAttach(false);
                      }}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 text-foreground hover:bg-muted transition-colors"
                    >
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm">Upload file</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={
                currentMode === 'thinking'
                  ? 'Still me, but smarter and better.'
                  : currentMode === 'vision' 
                  ? 'Mô tả điều bạn muốn biết về ảnh...'
                  : currentMode === 'document'
                  ? 'Hỏi về nội dung trong file...'
                  : 'Ask me anything...'
              }
              rows={1}
              className={`flex-1 resize-none bg-transparent py-4 pr-14 text-foreground placeholder:text-muted-foreground focus:outline-none ${currentMode === 'thinking' ? 'pl-1' : 'pl-5'}`}
              style={{ minHeight: '56px', maxHeight: '200px' }}
            />
            <button
              onClick={handleSend}
              disabled={(!message.trim() && attachedFiles.length === 0) || isLoading}
              className={`absolute right-3 bottom-3 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                (!message.trim() && attachedFiles.length === 0) || isLoading
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
        </div>
        
        <p className="text-xs text-muted-foreground text-center mt-3">
          Bilibily can make mistakes. Please double-check responses.
        </p>
      </div>

      {/* Coming Soon Popup */}
      {showComingSoon && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
          onClick={() => setShowComingSoon(false)}
        >
          <div 
            className="bg-card border border-border rounded-2xl p-8 max-w-sm mx-4 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Deeper Research
            </h3>
            <p className="text-muted-foreground mb-6">
              Tính năng này đang được phát triển. Vui lòng quay lại sau!
            </p>
            <button
              onClick={() => setShowComingSoon(false)}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
