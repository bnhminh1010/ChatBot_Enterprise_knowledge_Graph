export declare class ChatQueryDto {
    message: string;
    conversationId?: string;
    userId?: string;
}
export declare class ChatResponseDto {
    message: string;
    response: string;
    queryType: string;
    queryLevel: 'simple' | 'medium' | 'complex';
    processingTime: number;
    conversationId?: string;
    timestamp: Date;
}
