export declare class QueryCacheService {
    private readonly logger;
    private client;
    private readonly DEFAULT_TTL;
    private readonly CACHE_PREFIX;
    private isConnected;
    constructor();
    private initializeRedis;
    private generateCacheKey;
    get(toolName: string, args: any): Promise<any | null>;
    set(toolName: string, args: any, result: any, ttl?: number): Promise<void>;
    invalidate(toolName: string, args?: any): Promise<void>;
    invalidateAll(): Promise<void>;
    getStats(): Promise<{
        totalKeys: number;
        memoryUsage: string;
        isConnected: boolean;
    }>;
    isAvailable(): boolean;
    onModuleDestroy(): Promise<void>;
}
