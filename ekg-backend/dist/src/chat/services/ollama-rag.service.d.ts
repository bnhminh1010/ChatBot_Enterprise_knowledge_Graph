import { OllamaService } from '../../ai/ollama.service';
import { ChromaDBService } from '../../ai/chroma-db.service';
export declare class OllamaRAGService {
    private ollamaService;
    private chromaDBService;
    private readonly logger;
    private readonly TOP_K_CANDIDATES;
    private readonly TOP_K_FINAL;
    private readonly VECTOR_WEIGHT;
    private readonly KEYWORD_WEIGHT;
    constructor(ollamaService: OllamaService, chromaDBService: ChromaDBService);
    queryWithRAG(query: string, collectionName?: string, topK?: number, conversationHistory?: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>): Promise<string>;
    private rerankResults;
    private diversityFilter;
    private textSimilarity;
    private buildContext;
    private buildPrompt;
    private formatSearchResults;
    isAvailable(): Promise<boolean>;
}
