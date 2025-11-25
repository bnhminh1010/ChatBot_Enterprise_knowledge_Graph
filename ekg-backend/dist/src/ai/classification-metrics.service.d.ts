export interface ClassificationMetric {
    timestamp: number;
    level: 'simple' | 'medium' | 'complex';
    type: string;
    duration: number;
    success: boolean;
    method: 'gemini' | 'pattern-fallback';
}
export declare class ClassificationMetricsService {
    private readonly logger;
    private metrics;
    private readonly MAX_METRICS_HISTORY;
    recordClassification(level: 'simple' | 'medium' | 'complex', type: string, duration: number, success: boolean, method?: 'gemini' | 'pattern-fallback'): void;
    getMetricsSummary(): {
        total: number;
        byLevel?: undefined;
        avgDuration?: undefined;
        successRate?: undefined;
        fallbackRate?: undefined;
        recentMetrics?: undefined;
    } | {
        total: number;
        byLevel: Record<string, number>;
        avgDuration: number;
        successRate: string;
        fallbackRate: string;
        recentMetrics: ClassificationMetric[];
    };
}
