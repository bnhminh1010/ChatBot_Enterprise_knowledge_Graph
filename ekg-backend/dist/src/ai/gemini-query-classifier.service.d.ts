import { GeminiService } from './gemini.service';
export interface GeminiClassificationResult {
    level: 'simple' | 'medium' | 'complex';
    type: string;
    normalizedQuery: string;
    extractedEntities: {
        department?: string;
        skill?: string;
        project?: string;
        position?: string;
        employeeName?: string;
        group?: string;
        unit?: string;
        document?: string;
        technology?: string;
        id?: string;
        count?: boolean;
        experience?: number;
    };
    confidence: number;
    reasoning: string;
}
export declare class GeminiQueryClassifierService {
    private readonly geminiService;
    private readonly logger;
    constructor(geminiService: GeminiService);
    classifyQueryWithGemini(query: string): Promise<GeminiClassificationResult>;
    private buildClassificationPrompt;
    private parseGeminiResponse;
}
