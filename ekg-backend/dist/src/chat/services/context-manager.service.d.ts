import { RedisConversationService, ConversationMessage } from './redis-conversation.service';
export interface EntityReference {
    type: string;
    value: string;
    confidence: number;
    sourceMessageIndex: number;
    resolvedId?: string;
}
export interface ConversationContext {
    sessionId: string;
    userId: string;
    history: ConversationMessage[];
    currentTopic: string[];
    entities: Map<string, EntityReference>;
    lastIntent?: string;
    mood: 'formal' | 'casual' | 'urgent';
}
export declare class ContextManagerService {
    private readonly redisConversation;
    private readonly logger;
    constructor(redisConversation: RedisConversationService);
    getRelevantContext(sessionId: string, maxMessages?: number): Promise<ConversationContext>;
    resolveEntityReferences(query: string, context: ConversationContext): Promise<Map<string, EntityReference>>;
    private extractEntitiesFromHistory;
    private extractEntitiesFromMessage;
    private extractCurrentTopics;
    private detectMood;
    private findRecentEntityByType;
    updateContext(sessionId: string, userMessage: string, assistantResponse: string, intent?: string): Promise<void>;
}
