import { GeminiService } from '../../ai/gemini.service';
export interface SuggestedQuestion {
    question: string;
    category: 'related' | 'deeper' | 'alternative' | 'action';
    priority: number;
}
export declare class SuggestedQuestionsService {
    private readonly geminiService;
    private readonly logger;
    private readonly templates;
    constructor(geminiService: GeminiService);
    generateSuggestions(userQuery: string, assistantResponse: string, detectedEntities: Array<{
        type: string;
        value: string;
    }>, queryType: string): Promise<SuggestedQuestion[]>;
    private generateWithLLM;
    private getFallbackSuggestions;
    private deduplicateSuggestions;
    generateQuickSuggestions(queryType: string, mentionedEntities: string[]): SuggestedQuestion[];
}
