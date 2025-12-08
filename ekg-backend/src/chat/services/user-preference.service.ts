import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

export interface UserPreferences {
  userId: string;
  // Query patterns
  frequentTopics: TopicFrequency[]; // Most asked topics
  preferredResponseStyle: 'concise' | 'detailed' | 'auto';
  // Entity preferences
  frequentlyAskedEntities: EntityFrequency[]; // People, departments, projects they ask about
  // Behavior patterns
  averageQueryLength: number;
  preferredTimeOfDay: string; // Morning, afternoon, evening
  totalQueries: number;
  // Timestamps
  createdAt: number;
  updatedAt: number;
}

export interface TopicFrequency {
  topic: string; // e.g., "employees", "projects", "skills"
  count: number;
  lastAsked: number;
}

export interface EntityFrequency {
  type: string;
  value: string;
  count: number;
  lastAsked: number;
}

/**
 * User Preference Service
 * Phase 3: Learn user patterns and preferences for personalization
 * 
 * Features:
 * - Track frequently asked topics
 * - Remember entities user cares about
 * - Learn response style preferences
 * - Personalize future interactions
 */
@Injectable()
export class UserPreferenceService {
  private readonly logger = new Logger(UserPreferenceService.name);
  private redis: Redis;
  private readonly TTL_DAYS = 30; // Keep preferences for 30 days

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });
  }

  /**
   * Get user preferences
   */
  async getPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const data = await this.redis.get(`user_prefs:${userId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Failed to get preferences: ${error}`);
      return null;
    }
  }

  /**
   * Initialize preferences for new user
   */
  private createDefaultPreferences(userId: string): UserPreferences {
    return {
      userId,
      frequentTopics: [],
      preferredResponseStyle: 'auto',
      frequentlyAskedEntities: [],
      averageQueryLength: 0,
      preferredTimeOfDay: 'unknown',
      totalQueries: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Update preferences after each query
   */
  async recordQuery(
    userId: string,
    query: string,
    detectedEntities: Array<{ type: string; value: string }>,
    detectedTopic: string,
  ): Promise<void> {
    try {
      let prefs = await this.getPreferences(userId);
      if (!prefs) {
        prefs = this.createDefaultPreferences(userId);
      }

      const now = Date.now();

      // Update topic frequency
      const existingTopic = prefs.frequentTopics.find((t) => t.topic === detectedTopic);
      if (existingTopic) {
        existingTopic.count++;
        existingTopic.lastAsked = now;
      } else {
        prefs.frequentTopics.push({
          topic: detectedTopic,
          count: 1,
          lastAsked: now,
        });
      }

      // Keep only top 10 topics
      prefs.frequentTopics = prefs.frequentTopics
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Update entity frequency
      for (const entity of detectedEntities) {
        const key = `${entity.type}:${entity.value}`;
        const existingEntity = prefs.frequentlyAskedEntities.find(
          (e) => `${e.type}:${e.value}` === key,
        );

        if (existingEntity) {
          existingEntity.count++;
          existingEntity.lastAsked = now;
        } else {
          prefs.frequentlyAskedEntities.push({
            type: entity.type,
            value: entity.value,
            count: 1,
            lastAsked: now,
          });
        }
      }

      // Keep only top 20 entities
      prefs.frequentlyAskedEntities = prefs.frequentlyAskedEntities
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      // Update average query length
      const newTotal = prefs.totalQueries + 1;
      prefs.averageQueryLength = Math.round(
        (prefs.averageQueryLength * prefs.totalQueries + query.length) / newTotal,
      );
      prefs.totalQueries = newTotal;

      // Update time of day preference
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 12) {
        prefs.preferredTimeOfDay = 'morning';
      } else if (hour >= 12 && hour < 18) {
        prefs.preferredTimeOfDay = 'afternoon';
      } else {
        prefs.preferredTimeOfDay = 'evening';
      }

      prefs.updatedAt = now;

      // Save preferences
      await this.redis.setex(
        `user_prefs:${userId}`,
        this.TTL_DAYS * 24 * 60 * 60,
        JSON.stringify(prefs),
      );

      this.logger.debug(`Updated preferences for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to record query: ${error}`);
    }
  }

  /**
   * Get personalization hints for a query
   */
  async getPersonalizationHints(userId: string): Promise<{
    topTopics: string[];
    frequentEntities: Array<{ type: string; value: string }>;
    suggestedResponseStyle: string;
  }> {
    const prefs = await this.getPreferences(userId);

    if (!prefs) {
      return {
        topTopics: [],
        frequentEntities: [],
        suggestedResponseStyle: 'auto',
      };
    }

    return {
      topTopics: prefs.frequentTopics.slice(0, 5).map((t) => t.topic),
      frequentEntities: prefs.frequentlyAskedEntities.slice(0, 10).map((e) => ({
        type: e.type,
        value: e.value,
      })),
      suggestedResponseStyle: prefs.preferredResponseStyle,
    };
  }

  /**
   * Set response style preference
   */
  async setResponseStyle(
    userId: string,
    style: 'concise' | 'detailed' | 'auto',
  ): Promise<void> {
    let prefs = await this.getPreferences(userId);
    if (!prefs) {
      prefs = this.createDefaultPreferences(userId);
    }

    prefs.preferredResponseStyle = style;
    prefs.updatedAt = Date.now();

    await this.redis.setex(
      `user_prefs:${userId}`,
      this.TTL_DAYS * 24 * 60 * 60,
      JSON.stringify(prefs),
    );
  }

  /**
   * Get user stats
   */
  async getUserStats(userId: string): Promise<{
    totalQueries: number;
    topTopic: string | null;
    favoriteEntity: string | null;
    memberSince: number | null;
  }> {
    const prefs = await this.getPreferences(userId);

    if (!prefs) {
      return {
        totalQueries: 0,
        topTopic: null,
        favoriteEntity: null,
        memberSince: null,
      };
    }

    return {
      totalQueries: prefs.totalQueries,
      topTopic: prefs.frequentTopics[0]?.topic || null,
      favoriteEntity: prefs.frequentlyAskedEntities[0]
        ? `${prefs.frequentlyAskedEntities[0].type}: ${prefs.frequentlyAskedEntities[0].value}`
        : null,
      memberSince: prefs.createdAt,
    };
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    await this.redis.quit();
  }
}
