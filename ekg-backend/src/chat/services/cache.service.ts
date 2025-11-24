import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { QueryResponse } from '../interfaces/chat-metrics.interface';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

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

  getCacheKey(message: string): string {
    return `chat:${message.toLowerCase().trim()}`;
  }

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
