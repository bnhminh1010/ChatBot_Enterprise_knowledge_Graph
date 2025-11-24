export declare class CreateConversationDto {
    userId: string;
    title?: string;
}
export declare class AddMessageDto {
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    queryType?: string;
    queryLevel?: 'simple' | 'medium' | 'complex';
    processingTime?: number;
}
export declare class GetConversationHistoryDto {
    conversationId: string;
    limit?: number;
}
