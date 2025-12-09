/**
 * @fileoverview Cache Service - Query Response Caching
 * @module chat/services/cache.service
 *
 * Service quản lý caching cho query responses.
 * Sử dụng in-memory cache (cache-manager) cho performance.
 *
 * @author APTX3107 Team
 */
import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { QueryResponse } from '../interfaces/chat-metrics.interface';

/**
 * Service caching query responses.
 * TTL varies by query complexity level.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Lấy cached response.
   *
   * @param key - Cache key
   * @returns Cached response hoặc null
   */
  async get(key: string): Promise<QueryResponse | null> {
    try {
      const cached = await this.cacheManager.get<QueryResponse>(key);
      if (cached) {
        this.logger.debug(`Cache HIT: ${key}`);
        return cached;
      }
      this.logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      this.logger.warn(`Cache get error: ${error}`);
      return null;
    }
  }

  /**
   * Lưu response vào cache.
   *
   * @param key - Cache key
   * @param value - Response cần cache
   * @param ttlSeconds - TTL (seconds)
   */
  async set(
    key: string,
    value: QueryResponse,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttlSeconds * 1000);
      this.logger.debug(`Cached: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (error) {
      this.logger.warn(`Cache set error: ${error}`);
    }
  }

  /**
   * Generate cache key từ message.
   */
  getCacheKey(message: string): string {
    return `chat:${message.toLowerCase().trim()}`;
  }

  /**
   * Lấy TTL theo query level.
   * Simple: 1 hour, Medium: 30 min, Complex: 10 min.
   */
  getTTL(level: 'simple' | 'medium' | 'complex'): number {
    switch (level) {
      case 'simple':
        return 3600; // 1 hour
      case 'medium':
        return 1800; // 30 minutes
      case 'complex':
        return 600; // 10 minutes
      default:
        return 600;
    }
  }
}
