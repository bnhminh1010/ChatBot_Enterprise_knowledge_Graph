import type { Redis } from 'ioredis';
import { SearchResult } from '../../ai/chroma-db.service';
export declare class ContextCacheService {
    private readonly redis;
    private readonly logger;
    private readonly DEFAULT_TTL;
    constructor(redis: Redis);
    cacheContext(query: string, collectionName: string, contexts: SearchResult[], filters?: Record<string, any>, ttl?: number): Promise<void>;
    getContext(query: string, collectionName: string, filters?: Record<string, any>): Promise<SearchResult[] | null>;
    cacheEmbedding(text: string, embedding: number[], ttl?: number): Promise<void>;
    getEmbedding(text: string): Promise<number[] | null>;
    cacheRAGResponse(query: string, collectionName: string, response: string, ttl?: number): Promise<void>;
    getRAGResponse(query: string, collectionName: string): Promise<string | null>;
    invalidateCollection(collectionName: string): Promise<void>;
    private generateContextKey;
    private generateEmbeddingKey;
    private generateRAGKey;
    private hashString;
    private inferTTLFromQuery;
    getCacheStats(): Promise<{
        contextEntries: number;
        embeddingEntries: number;
        ragEntries: number;
    }>;
}
