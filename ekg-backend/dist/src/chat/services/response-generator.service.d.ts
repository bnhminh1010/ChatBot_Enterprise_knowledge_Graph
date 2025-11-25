import { GeminiService } from '../../ai/gemini.service';
import { IntentResult } from '../../ai/intent-understanding.service';
import { ConversationContext } from './context-manager.service';
import { QueryPlan } from './query-planner.service';
export declare class ResponseGeneratorService {
    private readonly geminiService;
    private readonly logger;
    constructor(geminiService: GeminiService);
    generate(data: any, intent: IntentResult, context: ConversationContext, plan?: QueryPlan): Promise<string>;
    private buildResponsePrompt;
    private enhanceResponse;
    private addFollowUpSuggestions;
    private generateFollowUpSuggestions;
    private fallbackStructuredResponse;
    addExplanation(response: string, plan: QueryPlan): Promise<string>;
}
