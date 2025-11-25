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
    generateResponseWithTools(prompt: string, tools: any[], context?: string, history?: Array<{
        role: 'user' | 'assistant' | 'function';
        content: string;
    }>): Promise<any>;
    continueChatWithToolResults(chatSession: any, toolResults: any[]): Promise<any>;
    summarize(text: string, maxLength?: number): Promise<string>;
}
