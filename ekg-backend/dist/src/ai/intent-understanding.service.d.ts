import { GeminiService } from './gemini.service';
import { ConversationContext } from '../chat/services/context-manager.service';
export interface IntentResult {
    primary: string;
    secondary?: string[];
    confidence: number;
    slots: Record<string, any>;
    requiresContext: boolean;
    contextEntities: string[];
    reasoning: string;
}
export declare class IntentUnderstandingService {
    private readonly geminiService;
    private readonly logger;
    constructor(geminiService: GeminiService);
    analyzeIntent(query: string, context: ConversationContext): Promise<IntentResult>;
    decomposeComplexQuery(query: string): Promise<IntentResult[]>;
    private buildIntentPrompt;
    private parseIntentResponse;
    private cleanJsonResponse;
    private fallbackIntent;
}
