import { GeminiService } from '../gemini.service';
import { AgentPlan, AgentContext } from './types/agent.types';
export declare class AgentPlannerService {
    private readonly geminiService;
    private readonly logger;
    constructor(geminiService: GeminiService);
    createPlan(query: string, context: AgentContext): Promise<AgentPlan & {
        needsTools?: boolean;
        directAnswer?: string;
    }>;
    private buildPlanningPrompt;
    private getPlanningSystemPrompt;
    private parseResponse;
    private parsePlanFromResponse;
    private createFallbackPlan;
}
