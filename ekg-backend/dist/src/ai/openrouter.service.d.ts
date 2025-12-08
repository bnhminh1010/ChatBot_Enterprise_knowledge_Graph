interface OpenRouterMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: any[];
    tool_call_id?: string;
}
interface OpenRouterResponse {
    type: 'text' | 'function_call';
    content?: string;
    functionCalls?: Array<{
        name: string;
        args: any;
    }>;
    rawResponse?: any;
}
export declare class OpenRouterService {
    private readonly logger;
    private client;
    private apiKey;
    private readonly baseUrl;
    private readonly defaultModel;
    constructor();
    isAvailable(): boolean;
    generateResponseWithTools(prompt: string, tools: any[], context?: string, history?: Array<{
        role: 'user' | 'assistant' | 'function';
        content: string;
    }>): Promise<OpenRouterResponse>;
    continueChatWithToolResults(previousMessages: OpenRouterMessage[], toolResults: Array<{
        name: string;
        result: any;
        tool_call_id?: string;
    }>, tools: any[]): Promise<OpenRouterResponse>;
    generateResponse(prompt: string, context?: string): Promise<string>;
}
export {};
