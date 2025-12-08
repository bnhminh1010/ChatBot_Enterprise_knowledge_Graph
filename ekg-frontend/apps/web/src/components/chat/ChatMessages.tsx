import { useRef, useEffect, useState } from 'react';
import { MessageContent } from './MessageContent';

export interface MessageMetadata {
  confidence?: number;
  reasoning?: string[];
  warnings?: string[];
  retrievedDataSources?: string[];
  processingTime?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status: 'loading' | 'error' | 'success' | 'idle' | 'pending' | 'sending' | 'delivered';
  metadata?: MessageMetadata;
  suggestedQuestions?: Array<{
    question: string;
    category: string;
  }>;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
  onSuggestionClick?: (question: string) => void;
}

// Confidence badge component
function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  let colorClass = 'bg-green-500/10 text-green-400 border-green-500/20';
  let label = 'Cao';
  
  if (percentage < 50) {
    colorClass = 'bg-red-500/10 text-red-400 border-red-500/20';
    label = 'Thấp';
  } else if (percentage < 75) {
    colorClass = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    label = 'Trung bình';
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border ${colorClass}`}>
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      {percentage}% ({label})
    </span>
  );
}

// Data source badge component
function DataSourceBadge({ sources }: { sources: string[] }) {
  if (!sources || sources.length === 0) return null;
  
  const friendlyNames: Record<string, string> = {
    'search_employees_advanced': '👤 Nhân viên',
    'search_employees_by_name': '👤 Nhân viên',
    'count_employees': '📊 Đếm NV',
    'search_departments_by_name': '🏢 Phòng ban',
    'count_departments': '📊 Đếm PB',
    'search_projects_by_name': '📁 Dự án',
    'count_projects': '📊 Đếm DA',
    'list_skills': '🔧 Kỹ năng',
    'search_documents': '📄 Tài liệu',
    'get_document_content': '📄 Nội dung',
  };

  const displaySources = sources.slice(0, 3).map(s => friendlyNames[s] || s);
  const remaining = sources.length - 3;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6M12 9v6" />
      </svg>
      {displaySources.join(', ')}
      {remaining > 0 && ` +${remaining}`}
    </span>
  );
}

// Processing time badge
function ProcessingTimeBadge({ time }: { time: number }) {
  const seconds = (time / 1000).toFixed(1);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {seconds}s
    </span>
  );
}

// Reasoning toggle component
function ReasoningSteps({ reasoning }: { reasoning: string[] }) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!reasoning || reasoning.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
      >
        <svg 
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {isOpen ? 'Ẩn quá trình suy luận' : 'Xem quá trình suy luận'}
      </button>
      
      {isOpen && (
        <div className="mt-2 pl-3 border-l-2 border-border space-y-1">
          {reasoning.map((step, i) => (
            <div key={i} className="text-xs text-muted-foreground">
              <span className="text-primary mr-1">{i + 1}.</span>
              {step}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Warnings display
function WarningsDisplay({ warnings }: { warnings: string[] }) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="mt-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
      <div className="flex items-start gap-2">
        <svg className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div className="text-xs text-yellow-400">
          {warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Suggested questions component
function SuggestedQuestions({ 
  questions, 
  onQuestionClick 
}: { 
  questions: Array<{ question: string; category: string }>; 
  onQuestionClick?: (question: string) => void;
}) {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="mt-3 pt-2 border-t border-border/30">
      <div className="text-xs text-muted-foreground mb-2">💡 Câu hỏi gợi ý:</div>
      <div className="flex flex-wrap gap-2">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => onQuestionClick?.(q.question)}
            className="text-xs px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
          >
            {q.question}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChatMessages({ messages, isLoading, onSuggestionClick }: ChatMessagesProps) {
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
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-foreground'
              }`}
            >
              <MessageContent content={message.content} role={message.role} />
              
              {/* Metadata section for assistant messages */}
              {message.role === 'assistant' && message.metadata && (
                <div className="mt-3 pt-2 border-t border-border/50 space-y-2">
                  {/* Badges row */}
                  <div className="flex flex-wrap gap-2">
                    {message.metadata.confidence !== undefined && (
                      <ConfidenceBadge confidence={message.metadata.confidence} />
                    )}
                    {message.metadata.retrievedDataSources && (
                      <DataSourceBadge sources={message.metadata.retrievedDataSources} />
                    )}
                    {message.metadata.processingTime && (
                      <ProcessingTimeBadge time={message.metadata.processingTime} />
                    )}
                  </div>

                  {/* Warnings */}
                  {message.metadata.warnings && (
                    <WarningsDisplay warnings={message.metadata.warnings} />
                  )}

                  {/* Reasoning steps (collapsible) */}
                  {message.metadata.reasoning && (
                    <ReasoningSteps reasoning={message.metadata.reasoning} />
                  )}
                </div>
              )}

              {/* Suggested follow-up questions */}
              {message.role === 'assistant' && message.suggestedQuestions && (
                <SuggestedQuestions 
                  questions={message.suggestedQuestions} 
                  onQuestionClick={onSuggestionClick}
                />
              )}

              <div className="text-xs opacity-70 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
                {message.status === 'sending' && ' · Đang gửi...'}
                {message.status === 'error' && ' · Gửi thất bại'}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator - Zen style: simple dots, subtle animation */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-xl px-4 py-3">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 rounded-full bg-primary opacity-60" />
                <div className="w-2 h-2 rounded-full bg-primary opacity-40" />
                <div className="w-2 h-2 rounded-full bg-primary opacity-20" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
