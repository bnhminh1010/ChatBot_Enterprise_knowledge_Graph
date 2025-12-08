export declare class ChatQueryDto {
    message: string;
    conversationId?: string;
    userId?: string;
}
export declare class ChatResponseDto {
    message: string;
    response: string;
    queryType: string;
    queryLevel: 'simple' | 'medium' | 'complex' | 'agent';
    processingTime: number;
    conversationId?: string;
    timestamp: Date;
    metadata?: {
        confidence?: number;
        reasoning?: string[];
        warnings?: string[];
        retrievedDataSources?: string[];
    };
    suggestedQuestions?: Array<{
        question: string;
        category: string;
    }>;
    graphData?: {
        nodes: Array<{
            id: string;
            label: string;
            type: string;
            val?: number;
        }>;
        links: Array<{
            source: string;
            target: string;
            relationship: string;
            value?: number;
        }>;
    };
}
