import { Neo4jService } from '../../core/neo4j/neo4j.service';
import { Conversation, Message, ConversationHistory, ConversationContext } from '../interfaces/conversation.interface';
export declare class ConversationHistoryService {
    private readonly neo4jService;
    private readonly logger;
    private readonly MAX_CONTEXT_MESSAGES;
    private readonly MAX_CONTEXT_LENGTH;
    constructor(neo4jService: Neo4jService);
    createConversation(userId: string, title?: string): Promise<Conversation>;
    addMessage(conversationId: string, role: 'user' | 'assistant' | 'system', content: string, metadata?: {
        queryType?: string;
        queryLevel?: 'simple' | 'medium' | 'complex';
        processingTime?: number;
    }): Promise<Message>;
    getConversationHistory(conversationId: string, limit?: number): Promise<ConversationHistory>;
    getConversationContext(conversationId: string): Promise<ConversationContext>;
    getUserConversations(userId: string, limit?: number): Promise<Conversation[]>;
    deleteConversation(conversationId: string): Promise<boolean>;
    private mapNodeToConversation;
    private mapNodeToMessage;
}
