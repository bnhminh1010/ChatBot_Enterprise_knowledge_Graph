import { OllamaService } from '../../ai/ollama.service';
import { ChromaDBService } from '../../ai/chroma-db.service';
export declare class OllamaRAGService {
    private ollamaService;
    private chromaDBService;
    private readonly logger;
    constructor(ollamaService: OllamaService, chromaDBService: ChromaDBService);
    queryWithRAG(query: string, collectionName?: string, topK?: number, conversationHistory?: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>): Promise<string>;
    private buildContext;
    private buildPrompt;
    private formatSearchResults;
    isAvailable(): Promise<boolean>;
}
