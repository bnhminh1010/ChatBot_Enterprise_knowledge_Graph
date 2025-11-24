export declare class GeminiService {
    private readonly logger;
    private client;
    private model;
    constructor();
    generateResponse(prompt: string, context?: string): Promise<string>;
    generateResponseWithHistory(currentMessage: string, conversationHistory: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>, databaseContext?: string): Promise<string>;
    chat(messages: {
        role: string;
        content: string;
    }[]): Promise<string>;
    streamResponse(prompt: string, context?: string): Promise<any>;
    extractInfo(text: string, schema: string): Promise<Record<string, any>>;
    classify(text: string, categories: string[]): Promise<string>;
    summarize(text: string, maxLength?: number): Promise<string>;
}
