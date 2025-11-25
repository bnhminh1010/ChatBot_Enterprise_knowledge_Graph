import { RedisConversationService, Conversation } from '../services/redis-conversation.service';
export declare class ConversationsController {
    private readonly redisConversation;
    private readonly logger;
    constructor(redisConversation: RedisConversationService);
    getUserConversations(user: any): Promise<Conversation[]>;
    getConversation(conversationId: string, user: any): Promise<Conversation>;
    deleteConversation(conversationId: string, user: any): Promise<{
        message: string;
    }>;
}
