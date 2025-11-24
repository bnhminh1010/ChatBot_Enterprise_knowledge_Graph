import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    queryType?: string;
    queryLevel?: string;
    processingTime?: number;
  };
}

export interface Conversation {
  id: string;
  userId: string;
  messages: ConversationMessage[];
  createdAt: number;
  updatedAt: number;
}

@Injectable()
export class RedisConversationService {
  private readonly logger = new Logger(RedisConversationService.name);
  private redis: Redis;
  private readonly MAX_MESSAGES = 50; // Max messages per conversation
  private readonly TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err}`);
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });
  }

  /**
   * Create new conversation or get existing
   */
  async getOrCreateConversation(userId: string, conversationId?: string): Promise<string> {
    if (conversationId) {
      const exists = await this.redis.exists(`conversation:${conversationId}`);
      if (exists) {
        return conversationId;
      }
    }

    // Create new conversation
    const newId = `CONV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const conversation: Conversation = {
      id: newId,
      userId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.redis.setex(
      `conversation:${newId}`,
      this.TTL_SECONDS,
      JSON.stringify(conversation)
    );

    // Index by user
    await this.redis.sadd(`user:${userId}:conversations`, newId);

    this.logger.debug(`Created conversation ${newId} for user ${userId}`);
    return newId;
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: any
  ): Promise<void> {
    try {
      const key = `conversation:${conversationId}`;
      const data = await this.redis.get(key);
      
      if (!data) {
        this.logger.warn(`Conversation ${conversationId} not found`);
        return;
      }

      const conversation: Conversation = JSON.parse(data);
      
      const message: ConversationMessage = {
        role,
        content,
        timestamp: Date.now(),
        metadata,
      };

      conversation.messages.push(message);
      conversation.updatedAt = Date.now();

      // Trim old messages if exceeds limit
      if (conversation.messages.length > this.MAX_MESSAGES) {
        conversation.messages = conversation.messages.slice(-this.MAX_MESSAGES);
      }

      // Save back with refreshed TTL
      await this.redis.setex(
        key,
        this.TTL_SECONDS,
        JSON.stringify(conversation)
      );

      this.logger.debug(`Added ${role} message to conversation ${conversationId}`);
    } catch (error) {
      this.logger.error(`Failed to add message: ${error}`);
    }
  }

  /**
   * Get recent messages for context (for Gemini/Ollama)
   */
  async getConversationContext(
    conversationId: string,
    maxMessages: number = 10
  ): Promise<ConversationMessage[]> {
    try {
      const data = await this.redis.get(`conversation:${conversationId}`);
      
      if (!data) {
        return [];
      }

      const conversation: Conversation = JSON.parse(data);
      
      // Return last N messages
      return conversation.messages.slice(-maxMessages);
    } catch (error) {
      this.logger.error(`Failed to get conversation context: ${error}`);
      return [];
    }
  }

  /**
   * Get full conversation
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const data = await this.redis.get(`conversation:${conversationId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Failed to get conversation: ${error}`);
      return null;
    }
  }

  /**
   * Get user's conversations
   */
  async getUserConversations(userId: string, limit: number = 20): Promise<Conversation[]> {
    try {
      const conversationIds = await this.redis.smembers(`user:${userId}:conversations`);
      
      const conversations: Conversation[] = [];
      for (const id of conversationIds.slice(0, limit)) {
        const conv = await this.getConversation(id);
        if (conv) {
          conversations.push(conv);
        }
      }

      // Sort by updatedAt DESC
      return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      this.logger.error(`Failed to get user conversations: ${error}`);
      return [];
    }
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      const conv = await this.getConversation(conversationId);
      if (conv) {
        await this.redis.del(`conversation:${conversationId}`);
        await this.redis.srem(`user:${conv.userId}:conversations`, conversationId);
        this.logger.log(`Deleted conversation ${conversationId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete conversation: ${error}`);
    }
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    await this.redis.quit();
  }
}
