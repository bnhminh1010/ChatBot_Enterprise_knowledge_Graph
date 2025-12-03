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
    description: "Tìm kiếm nhân viên theo kỹ năng, vị trí, hoặc dự án",
    query: "Tìm nhân viên có kỹ năng Python và đang làm dự án AI"
  },
  {
    icon: FileText,
    title: "Knowledge Query",
    description: "Truy vấn thông tin từ knowledge graph doanh nghiệp",
    query: "Cho tôi biết về các dự án đang triển khai"
  },
  {
    icon: Zap,
    title: "Data Analytics",
    description: "Phân tích dữ liệu và thống kê hệ thống",
    query: "Thống kê nhân viên theo phòng ban và kỹ năng"
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
        {/* Bot Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-linear-to-r from-[#E6775B] to-[#F0A66B] rounded-full blur-xl opacity-50" />
            <div className="relative bg-linear-to-r from-[#E6775B] to-[#F0A66B] p-5 rounded-full">
              <Bot className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>

        {/* Greeting */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {getGreeting()}, {userName}
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold">
            How Can I{" "}
            <span className="gradient-text">
              Assist You Today?
            </span>
          </h2>
        </div>

        {/* Suggestion Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SUGGESTIONS.map((suggestion, index) => {
            const Icon = suggestion.icon;
            return (
              <button
                key={index}
                onClick={() => onSuggestionClick?.(suggestion.query)}
                className="group relative bg-card border border-border rounded-xl p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#E6775B]/30 hover:shadow-lg hover:shadow-[#E6775B]/10"
              >
                <Icon className="w-6 h-6 text-muted-foreground mb-4 group-hover:text-primary transition-colors" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {suggestion.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
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
