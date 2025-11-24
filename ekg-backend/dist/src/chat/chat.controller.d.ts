import { ChatService } from './chat.service';
import { MetricsService } from './services/metrics.service';
import { ChatQueryDto, ChatResponseDto } from './dto/chat-query.dto';
import { Neo4jService } from '../core/neo4j/neo4j.service';
export declare class ChatController {
    private chatService;
    private metricsService;
    private neo4jService;
    private readonly logger;
    constructor(chatService: ChatService, metricsService: MetricsService, neo4jService: Neo4jService);
    processQuery(dto: ChatQueryDto, user: any): Promise<ChatResponseDto>;
    indexEntities(): Promise<{
        message: string;
    }>;
    health(): Promise<{
        status: string;
        services: {
            neo4j: boolean | string;
            env: {
                NEO4J_URI: boolean;
                NEO4J_USER: boolean;
                NEO4J_PASSWORD: boolean;
                GEMINI_API_KEY: boolean;
            };
        };
        timestamp: Date;
    }>;
    getMetrics(): {
        total: number;
        success: number;
        failed: number;
        cacheHitRate: number;
        avgProcessingTime: number;
        byLevel: Record<string, number>;
        byType: Record<string, number>;
        recentQueries: import("./interfaces/chat-metrics.interface").ChatMetrics[];
    };
}
