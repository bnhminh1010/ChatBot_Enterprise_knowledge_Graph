export interface Conversation {
    id: string;
    userId: string;
    title?: string;
    createdAt: Date;
    updatedAt: Date;
    messageCount?: number;
}
export interface Message {
    id: string;
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    queryType?: string;
    queryLevel?: 'simple' | 'medium' | 'complex';
    processingTime?: number;
    timestamp: Date;
}
export interface ConversationHistory {
    conversation: Conversation;
    messages: Message[];
}
export interface ConversationContext {
    conversationId: string;
    recentMessages: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    summary?: string;
}
