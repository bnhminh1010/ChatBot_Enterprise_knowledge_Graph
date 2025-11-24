import type { Cache } from 'cache-manager';
import { QueryResponse } from '../interfaces/chat-metrics.interface';
export declare class CacheService {
    private cacheManager;
    private readonly logger;
    constructor(cacheManager: Cache);
    get(key: string): Promise<QueryResponse | null>;
    set(key: string, value: QueryResponse, ttlSeconds: number): Promise<void>;
    getCacheKey(message: string): string;
    getTTL(level: 'simple' | 'medium' | 'complex'): number;
}
