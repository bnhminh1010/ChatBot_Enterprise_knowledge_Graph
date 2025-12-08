"use client";

import { Bot, FileText, Zap, Search } from 'lucide-react';

interface ChatLandingProps {
  onSuggestionClick?: (suggestion: string) => void;
  userName?: string;
}

const SUGGESTIONS = [
  {
    icon: Search,
    title: "Employee Search",
    description: "Cách tìm kiếm nhân viên theo kỹ năng và dự án",
    query: "Hướng dẫn tôi cách tìm kiếm nhân viên trong hệ thống"
  },
  {
    icon: FileText,
    title: "Knowledge Query",
    description: "Cách truy vấn thông tin từ Knowledge Graph",
    query: "Hướng dẫn tôi cách truy vấn thông tin từ Knowledge Graph"
  },
  {
    icon: Zap,
    title: "Data Analytics",
    description: "Cách xem thống kê và phân tích dữ liệu",
    query: "Hướng dẫn tôi cách xem báo cáo và phân tích dữ liệu"
  }
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function ChatLanding({ onSuggestionClick, userName = "User" }: ChatLandingProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Bot Icon - Zen style: simple, no blur effects */}
        <div className="flex justify-center mb-8">
          <div className="bg-primary p-5 rounded-full">
            <Bot className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Greeting */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            {getGreeting()}, {userName}
          </h1>
          <h2 className="text-2xl md:text-3xl font-medium text-muted-foreground">
            How can I <span className="text-primary">assist you today?</span>
          </h2>
        </div>

        {/* Suggestion Cards - Zen style: clean borders, no hover effects */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SUGGESTIONS.map((suggestion, index) => {
            const Icon = suggestion.icon;
            return (
              <button
                key={index}
                onClick={() => onSuggestionClick?.(suggestion.query)}
                className="group flex flex-col items-start p-6 h-full bg-card border border-border hover:border-primary/50 rounded-xl transition-colors"
              >
                <div className="p-3 rounded-lg bg-muted mb-4">
                  <Icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {suggestion.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed text-left">
                  {suggestion.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Helper Text */}
        <p className="text-center text-sm text-muted-foreground mt-12">
          Hoặc nhập truy vấn của bạn vào ô bên dưới
        </p>
      </div>
    </div>
  );
}
