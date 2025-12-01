import { ToolDefinition } from '../../gemini-tools.service';

/**
 * Agent Plan - Kế hoạch thực hiện được tạo bởi AgentPlanner
 * Chứa các bước cần thực hiện TRƯỚC KHI execute
 */
export interface AgentPlan {
  goal: string; // Mục tiêu tổng thể
  steps: PlanStep[]; // Các bước dự kiến (chưa có observation)
  estimatedTokens: number; // Ước tính token usage
  createdAt: Date;
}

/**
 * Plan Step - Một bước trong plan (chưa execute)
 */
export interface PlanStep {
  stepNumber: number;
  thought: string; // Reasoning: Tại sao cần step này
  action: AgentAction; // Hành động cần thực hiện
}

/**
 * Agent Action - Hành động cụ thể (tool call)
 */
export interface AgentAction {
  tool: string; // Tool name
  args: Record<string, any>; // Tool arguments
  reason: string; // Lý do chọn tool này
}

/**
 * Agent Step - Một bước đã/đang được execute
 * Extends PlanStep với observation và status
 */
export interface AgentStep extends PlanStep {
  observation?: any; // Kết quả từ tool execution
  status: AgentStepStatus;
  error?: string; // Error message nếu failed
  executionTime?: number; // Thời gian execute (ms)
}

/**
 * Agent Step Status
 */
export type AgentStepStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Agent Result - Kết quả cuối cùng từ agent execution
 */
export interface AgentResult {
  success: boolean;
  finalAnswer: string; // Câu trả lời cuối cùng cho user
  steps: AgentStep[]; // Tất cả steps đã execute
  totalSteps: number;
  executionTime: number; // Tổng thời gian (ms)
  error?: string; // Error message nếu failed
}

/**
 * Agent Execution - Full execution record để lưu vào memory
 */
export interface AgentExecution {
  id: string;
  query: string; // User query gốc
  plan: AgentPlan;
  result: AgentResult;
  timestamp: Date;
  conversationId?: string;
  userId?: string;
}

/**
 * Agent Context - Context cho planning
 */
export interface AgentContext {
  conversationHistory: ConversationMessage[];
  availableTools: ToolDefinition[];
  userPreferences?: Record<string, any>;
}

/**
 * Conversation Message
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

/**
 * Agent Feedback - Feedback từ user để improve agent
 */
export interface AgentFeedback {
  executionId: string;
  rating: number; // 1-5
  comment?: string;
  wasHelpful: boolean;
  timestamp: Date;
}

/**
 * Agent Configuration
 */
export interface AgentConfig {
  maxSteps: number; // Max số steps allowed (tránh infinite loop)
  maxExecutionTime: number; // Max execution time (ms)
  enableDynamicPlanning: boolean; // Cho phép thêm steps runtime
  enableLearning: boolean; // Cho phép học từ past executions
  verbose: boolean; // Log chi tiết
}

/**
 * Default Agent Config
 */
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  maxSteps: 5,
  maxExecutionTime: 30000, // 30s
  enableDynamicPlanning: true,
  enableLearning: false, // Tắt learning ban đầu
  verbose: true,
};
