import { Injectable, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import * as crypto from 'crypto';

/**
 * Query Cache Service
 * Cache tool results để giảm latency và API costs
 *
 * Cache Strategy:
 * - Redis với TTL configurable
 * - Cache key = hash(toolName + args)
 * - Invalidation khi data thay đổi
 */
@Injectable()
export class QueryCacheService {
  private readonly logger = new Logger(QueryCacheService.name);
  private client: RedisClientType;
  private readonly DEFAULT_TTL = 3600; // 1 hour
  private readonly CACHE_PREFIX = 'tool_cache:';
  private isConnected = false;

  constructor() {
    this.initializeRedis();
  }

  /**
   * Initialize Redis client
   */
  private async initializeRedis() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              this.logger.error('Max Redis reconnection attempts reached');
              return new Error('Max retries reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        this.logger.error(`Redis error: ${err.message}`);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        this.logger.log('✅ Redis connected successfully');
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      this.logger.error(`Failed to initialize Redis: ${error.message}`);
      this.isConnected = false;
    }
  }

  /**
   * Generate cache key từ tool name và args
   */
  private generateCacheKey(toolName: string, args: any): string {
    const argsString = JSON.stringify(args, Object.keys(args).sort());
    const hash = crypto
      .createHash('md5')
      .update(`${toolName}:${argsString}`)
      .digest('hex');
    return `${this.CACHE_PREFIX}${toolName}:${hash}`;
  }

  /**
   * Get cached result
   */
  async get(toolName: string, args: any): Promise<any | null> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache get');
      return null;
    }

    try {
      const key = this.generateCacheKey(toolName, args);
      const cached = await this.client.get(key);

      if (cached) {
        this.logger.log(`🎯 Cache HIT for ${toolName}`);
        return JSON.parse(cached);
      }

      this.logger.log(`❌ Cache MISS for ${toolName}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache get error: ${error.message}`);
      return null;
    }
  }

  /**
   * Set cache với TTL
   */
  async set(
    toolName: string,
    args: any,
    result: any,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache set');
      return;
    }

    try {
      const key = this.generateCacheKey(toolName, args);
      await this.client.setEx(key, ttl, JSON.stringify(result));
      this.logger.log(`💾 Cached result for ${toolName} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Cache set error: ${error.message}`);
    }
  }

  /**
   * Invalidate cache cho specific tool
   */
  async invalidate(toolName: string, args?: any): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      if (args) {
        // Invalidate specific cache entry
        const key = this.generateCacheKey(toolName, args);
        await this.client.del(key);
        this.logger.log(`🗑️  Invalidated cache for ${toolName}`);
      } else {
        // Invalidate all cache entries for this tool
        const pattern = `${this.CACHE_PREFIX}${toolName}:*`;
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(keys);
          this.logger.log(
            `🗑️  Invalidated ${keys.length} cache entries for ${toolName}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Cache invalidation error: ${error.message}`);
    }
  }

  /**
   * Invalidate all cache (use sparingly)
   */
  async invalidateAll(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      const keys = await this.client.keys(`${this.CACHE_PREFIX}*`);
      if (keys.length > 0) {
        await this.client.del(keys);
        this.logger.log(`🗑️  Invalidated ${keys.length} total cache entries`);
      }
    } catch (error) {
      this.logger.error(`Cache invalidateAll error: ${error.message}`);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    isConnected: boolean;
  }> {
    if (!this.isConnected) {
      return {
        totalKeys: 0,
        memoryUsage: '0 MB',
        isConnected: false,
      };
    }

    try {
      const keys = await this.client.keys(`${this.CACHE_PREFIX}*`);
      const info = await this.client.info('memory');
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'Unknown';

      return {
        totalKeys: keys.length,
        memoryUsage,
        isConnected: true,
      };
    } catch (error) {
      this.logger.error(`Failed to get cache stats: ${error.message}`);
      return {
        totalKeys: 0,
        memoryUsage: '0 MB',
        isConnected: this.isConnected,
      };
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.isConnected;
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }
}
