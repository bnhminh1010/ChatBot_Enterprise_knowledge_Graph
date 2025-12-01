import { GeminiService } from '../gemini.service';
import { GeminiToolsService } from '../gemini-tools.service';
import { AgentPlan, AgentResult } from './types/agent.types';
export declare class AgentExecutorService {
    private readonly geminiToolsService;
    private readonly geminiService;
    private readonly logger;
    constructor(geminiToolsService: GeminiToolsService, geminiService: GeminiService);
    execute(plan: AgentPlan): Promise<AgentResult>;
    private executeSteps;
    private executeStep;
    private checkIfNeedsMoreSteps;
    private buildContinuationPrompt;
    private getContinuationSystemPrompt;
    private generateFinalAnswer;
    private buildFinalAnswerPrompt;
    private getFinalAnswerSystemPrompt;
    private formatObservation;
}
