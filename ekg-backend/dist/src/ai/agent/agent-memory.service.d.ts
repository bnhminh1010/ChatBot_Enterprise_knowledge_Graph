import { Redis } from 'ioredis';
import { AgentExecution, AgentFeedback } from './types/agent.types';
export declare class AgentMemoryService {
    private readonly redis;
    private readonly logger;
    private readonly EXECUTION_KEY_PREFIX;
    private readonly EXECUTION_LIST_KEY;
    private readonly FEEDBACK_KEY_PREFIX;
    private readonly TTL_SECONDS;
    constructor(redis: Redis);
    saveExecution(execution: AgentExecution): Promise<void>;
    getExecution(executionId: string): Promise<AgentExecution | null>;
    getRecentExecutions(limit?: number): Promise<AgentExecution[]>;
    getRelevantHistory(query: string, limit?: number): Promise<AgentExecution[]>;
    saveFeedback(feedback: AgentFeedback): Promise<void>;
    getFeedback(executionId: string): Promise<AgentFeedback | null>;
    getStatistics(): Promise<{
        totalExecutions: number;
        avgSteps: number;
        avgExecutionTime: number;
        successRate: number;
    }>;
    clearMemory(): Promise<void>;
}
