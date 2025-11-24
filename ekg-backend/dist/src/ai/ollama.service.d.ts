export interface OllamaEmbeddingResponse {
    embedding: number[];
}
export interface OllamaGenerateResponse {
    response: string;
    done: boolean;
}
export declare class OllamaService {
    private readonly logger;
    private readonly ollamaUrl;
    private readonly modelName;
    constructor();
    isHealthy(): Promise<boolean>;
    hasModel(modelName?: string): Promise<boolean>;
    generateEmbedding(text: string, model?: string): Promise<number[]>;
    generateResponse(prompt: string, model?: string, stream?: boolean): Promise<string>;
    pullModel(modelName?: string): Promise<void>;
}
