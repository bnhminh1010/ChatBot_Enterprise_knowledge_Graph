import { Injectable, Logger, Inject } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { SearchResult } from '../../ai/chroma-db.service';
import * as crypto from 'crypto';

/**
 * Context Caching Service
 * Cache retrieved contexts và embeddings trong Redis để improve performance
 */
@Injectable()
export class ContextCacheService {
  private readonly logger = new Logger(ContextCacheService.name);

  private readonly DEFAULT_TTL = parseInt(
    process.env.RAG_CONTEXT_CACHE_TTL || '3600',
  ); // 1 hour

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  /**
   * Cache search results/contexts
   */
  async cacheContext(
    query: string,
    collectionName: string,
    contexts: SearchResult[],
    filters?: Record<string, any>,
    ttl?: number,
  ): Promise<void> {
    try {
      const key = this.generateContextKey(query, collectionName, filters);
      const value = JSON.stringify(contexts);

      await this.redis.setex(key, ttl || this.DEFAULT_TTL, value);
      
      this.logger.debug(
        `Cached ${contexts.length} contexts for query: "${query.substring(0, 40)}..."`,
      );
    } catch (error) {
      this.logger.warn(`Failed to cache context: ${error.message}`);
    }
  }

  /**
   * Get cached contexts
   */
  async getContext(
    query: string,
    collectionName: string,
    filters?: Record<string, any>,
  ): Promise<SearchResult[] | null> {
    try {
      const key = this.generateContextKey(query, collectionName, filters);
      const cached = await this.redis.get(key);

      if (cached) {
        this.logger.debug(
          `Cache HIT for query: "${query.substring(0, 40)}..."`,
        );
        return JSON.parse(cached);
      }

      this.logger.debug(`Cache MISS for query: "${query.substring(0, 40)}..."`);
      return null;
    } catch (error) {
      this.logger.warn(`Failed to get cached context: ${error.message}`);
      return null;
    }
  }

  /**
   * Cache generated embedding
   */
  async cacheEmbedding(
    text: string,
    embedding: number[],
    ttl: number = 86400, // 24 hours
  ): Promise<void> {
    try {
      const key = this.generateEmbeddingKey(text);
      const value = JSON.stringify(embedding);

      await this.redis.setex(key, ttl, value);
      
      this.logger.debug(
        `Cached embedding for text: "${text.substring(0, 40)}..."`,
      );
    } catch (error) {
      this.logger.warn(`Failed to cache embedding: ${error.message}`);
    }
  }

  /**
   * Get cached embedding
   */
  async getEmbedding(text: string): Promise<number[] | null> {
    try {
      const key = this.generateEmbeddingKey(text);
      const cached = await this.redis.get(key);

      if (cached) {
        this.logger.debug(
          `Embedding cache HIT for: "${text.substring(0, 40)}..."`,
        );
        return JSON.parse(cached);
      }

      return null;
    } catch (error) {
      this.logger.warn(`Failed to get cached embedding: ${error.message}`);
      return null;
    }
  }

  /**
   * Cache RAG response
   */
  async cacheRAGResponse(
    query: string,
    collectionName: string,
    response: string,
    ttl?: number,
  ): Promise<void> {
    try {
      const key = this.generateRAGKey(query, collectionName);
      
      // Shorter TTL for RAG responses (10 mins for dynamic, 1 hour for factual)
      const responseTTL = ttl || this.inferTTLFromQuery(query);

      await this.redis.setex(key, responseTTL, response);
      
      this.logger.debug(
        `Cached RAG response (TTL: ${responseTTL}s) for: "${query.substring(0, 40)}..."`,
      );
    } catch (error) {
      this.logger.warn(`Failed to cache RAG response: ${error.message}`);
    }
  }

  /**
   * Get cached RAG response
   */
  async getRAGResponse(
    query: string,
    collectionName: string,
  ): Promise<string | null> {
    try {
      const key = this.generateRAGKey(query, collectionName);
      const cached = await this.redis.get(key);

      if (cached) {
        this.logger.debug(
          `RAG cache HIT for: "${query.substring(0, 40)}..."`,
        );
        return cached;
      }

      return null;
    } catch (error) {
      this.logger.warn(`Failed to get cached RAG response: ${error.message}`);
      return null;
    }
  }

  /**
   * Invalidate cache for a collection (when data updates)
   */
  async invalidateCollection(collectionName: string): Promise<void> {
    try {
      const pattern = `context:${collectionName}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(
          `Invalidated ${keys.length} cache entries for collection: ${collectionName}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate collection cache: ${error.message}`,
      );
    }
  }

  /**
   * Generate cache key for contexts
   */
  private generateContextKey(
    query: string,
    collectionName: string,
    filters?: Record<string, any>,
  ): string {
    const normalized = query.toLowerCase().trim();
    const filterString = filters ? JSON.stringify(filters) : '';
    const hash = this.hashString(`${normalized}${filterString}`);
    return `context:${collectionName}:${hash}`;
  }

  /**
   * Generate cache key for embeddings
   */
  private generateEmbeddingKey(text: string): string {
    const normalized = text.toLowerCase().trim();
    const hash = this.hashString(normalized);
    return `embedding:${hash}`;
  }

  /**
   * Generate cache key for RAG responses
   */
  private generateRAGKey(query: string, collectionName: string): string {
    const normalized = query.toLowerCase().trim();
    const hash = this.hashString(normalized);
    return `rag:${collectionName}:${hash}`;
  }

  /**
   * Hash string to generate stable cache key
   */
  private hashString(input: string): string {
    return crypto.createHash('md5').update(input).digest('hex');
  }

  /**
   * Infer appropriate TTL based on query type
   */
  private inferTTLFromQuery(query: string): number {
    const lowerQuery = query.toLowerCase();

    // Dynamic queries (count, current, latest) - shorter TTL
    if (
      lowerQuery.includes('hiện tại') ||
      lowerQuery.includes('current') ||
      lowerQuery.includes('latest') ||
      lowerQuery.includes('bao nhiêu') ||
      lowerQuery.includes('count')
    ) {
      return 600; // 10 minutes
    }

    // Factual queries - longer TTL
    return 3600; // 1 hour
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    contextEntries: number;
    embeddingEntries: number;
    ragEntries: number;
  }> {
    try {
      const [contextKeys, embeddingKeys, ragKeys] = await Promise.all([
        this.redis.keys('context:*'),
        this.redis.keys('embedding:*'),
        this.redis.keys('rag:*'),
      ]);

      return {
        contextEntries: contextKeys.length,
        embeddingEntries: embeddingKeys.length,
        ragEntries: ragKeys.length,
      };
    } catch (error) {
      this.logger.warn(`Failed to get cache stats: ${error.message}`);
      return {
        contextEntries: 0,
        embeddingEntries: 0,
        ragEntries: 0,
      };
    }
  }
}
