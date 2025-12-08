import { GeminiService } from '../gemini.service';
import { AgentPlan, AgentContext } from './types/agent.types';
import { QueryAnalyzerService } from '../../chat/services/query-analyzer.service';
import { QueryAnalysisResult } from '../../core/interfaces/query-analysis.interface';
export declare class AgentPlannerService {
    private readonly geminiService;
    private readonly queryAnalyzer;
    private readonly logger;
    constructor(geminiService: GeminiService, queryAnalyzer: QueryAnalyzerService);
    createPlan(query: string, context: AgentContext): Promise<AgentPlan & {
        needsTools?: boolean;
        directAnswer?: string;
        queryAnalysis?: QueryAnalysisResult;
    }>;
    private buildPlanningPrompt;
    private getPlanningSystemPrompt;
    private parseResponse;
    private parsePlanFromResponse;
    private createFallbackPlan;
}
