export interface ConversationMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    metadata?: {
        queryType?: string;
        queryLevel?: string;
        processingTime?: number;
    };
}
export interface Conversation {
    id: string;
    userId: string;
    messages: ConversationMessage[];
    createdAt: number;
    updatedAt: number;
}
export declare class RedisConversationService {
    private readonly logger;
    private redis;
    private readonly MAX_MESSAGES;
    private readonly TTL_SECONDS;
    constructor();
    getOrCreateConversation(userId: string, conversationId?: string): Promise<string>;
    addMessage(conversationId: string, role: 'user' | 'assistant', content: string, metadata?: any): Promise<void>;
    getConversationContext(conversationId: string, maxMessages?: number): Promise<ConversationMessage[]>;
    getConversation(conversationId: string): Promise<Conversation | null>;
    getUserConversations(userId: string, limit?: number): Promise<Conversation[]>;
    deleteConversation(conversationId: string): Promise<void>;
    isHealthy(): Promise<boolean>;
    onModuleDestroy(): Promise<void>;
}
