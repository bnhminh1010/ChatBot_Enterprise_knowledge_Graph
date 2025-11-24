import { ChatMetrics } from '../interfaces/chat-metrics.interface';
export declare class MetricsService {
    private metricsHistory;
    private readonly MAX_METRICS;
    log(metrics: ChatMetrics): void;
    getStats(): {
        total: number;
        success: number;
        failed: number;
        cacheHitRate: number;
        avgProcessingTime: number;
        byLevel: Record<string, number>;
        byType: Record<string, number>;
        recentQueries: ChatMetrics[];
    };
    getAll(): ChatMetrics[];
}
