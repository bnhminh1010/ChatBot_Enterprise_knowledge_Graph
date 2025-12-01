import { ToolDefinition } from '../../gemini-tools.service';
export interface AgentPlan {
    goal: string;
    steps: PlanStep[];
    estimatedTokens: number;
    createdAt: Date;
}
export interface PlanStep {
    stepNumber: number;
    thought: string;
    action: AgentAction;
}
export interface AgentAction {
    tool: string;
    args: Record<string, any>;
    reason: string;
}
export interface AgentStep extends PlanStep {
    observation?: any;
    status: AgentStepStatus;
    error?: string;
    executionTime?: number;
}
export type AgentStepStatus = 'pending' | 'running' | 'completed' | 'failed';
export interface AgentResult {
    success: boolean;
    finalAnswer: string;
    steps: AgentStep[];
    totalSteps: number;
    executionTime: number;
    error?: string;
}
export interface AgentExecution {
    id: string;
    query: string;
    plan: AgentPlan;
    result: AgentResult;
    timestamp: Date;
    conversationId?: string;
    userId?: string;
}
export interface AgentContext {
    conversationHistory: ConversationMessage[];
    availableTools: ToolDefinition[];
    userPreferences?: Record<string, any>;
}
export interface ConversationMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
}
export interface AgentFeedback {
    executionId: string;
    rating: number;
    comment?: string;
    wasHelpful: boolean;
    timestamp: Date;
}
export interface AgentConfig {
    maxSteps: number;
    maxExecutionTime: number;
    enableDynamicPlanning: boolean;
    enableLearning: boolean;
    verbose: boolean;
}
export declare const DEFAULT_AGENT_CONFIG: AgentConfig;
