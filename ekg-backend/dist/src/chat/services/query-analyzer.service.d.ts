import { GeminiService } from '../../ai/gemini.service';
import { QueryAnalysisResult, QueryAnalysisContext } from '../../core/interfaces/query-analysis.interface';
export declare class QueryAnalyzerService {
    private readonly geminiService;
    private readonly logger;
    constructor(geminiService: GeminiService);
    analyzeQuery(query: string, context?: QueryAnalysisContext): Promise<QueryAnalysisResult>;
    private normalizeQuery;
    private quickAnalysis;
    private deepAnalysisWithGemini;
    private buildAnalysisPrompt;
    private getAnalysisSystemPrompt;
    private parseGeminiResponse;
    private calculateComplexity;
    private extractEntitiesFromQuery;
    private createSimpleResult;
    private fallbackAnalysis;
    private isGreeting;
}
