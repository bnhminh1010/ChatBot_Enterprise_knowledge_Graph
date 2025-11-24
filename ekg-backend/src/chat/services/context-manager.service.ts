import { Injectable, Logger } from '@nestjs/common';
import { RedisConversationService, ConversationMessage } from './redis-conversation.service';

export interface EntityReference {
  type: string;  // 'employee', 'department', 'project', 'skill', etc.
  value: string;
  confidence: number;
  sourceMessageIndex: number;
  resolvedId?: string;
}

export interface ConversationContext {
  sessionId: string;
  userId: string;
  history: ConversationMessage[];
  currentTopic: string[];
  entities: Map<string, EntityReference>;
  lastIntent?: string;
  mood: 'formal' | 'casual' | 'urgent';
}

/**
 * Context Manager Service
 * Quản lý conversation context, entity resolution, và session state
 */
@Injectable()
export class ContextManagerService {
  private readonly logger = new Logger(ContextManagerService.name);

  constructor(
    private readonly redisConversation: RedisConversationService,
  ) {}

  /**
   * Lấy context từ conversation history
   */
  async getRelevantContext(
    sessionId: string,
    maxMessages: number = 10,
  ): Promise<ConversationContext> {
    try {
      // Get conversation from Redis
      const messages = await this.redisConversation.getConversationContext(
        sessionId,
        maxMessages,
      );

      // Extract entities from history
      const entities = this.extractEntitiesFromHistory(messages);

      // Detect current topics
      const topics = this.extractCurrentTopics(messages);

      // Detect conversation mood
      const mood = this.detectMood(messages);

      const context: ConversationContext = {
        sessionId,
        userId: '', // Will be filled by caller if needed
        history: messages,
        currentTopic: topics,
        entities,
        mood,
      };

      this.logger.debug(
        `Retrieved context for session ${sessionId}: ${topics.length} topics, ${entities.size} entities`,
      );

      return context;
    } catch (error) {
      this.logger.error(`Failed to get context: ${error}`);
      // Return empty context on error
      return {
        sessionId,
        userId: '',
        history: [],
        currentTopic: [],
        entities: new Map(),
        mood: 'formal',
      };
    }
  }

  /**
   * Resolve entity references (như "họ", "người đó", "phòng này")
   */
  async resolveEntityReferences(
    query: string,
    context: ConversationContext,
  ): Promise<Map<string, EntityReference>> {
    const resolvedEntities = new Map<string, EntityReference>();

    // Common pronouns và references
    const pronounPatterns = [
      { pattern: /\b(họ|người đó|người đấy|anh ấy|chị ấy)\b/i, type: 'person' },
      { pattern: /\b(phòng (đó|này|đấy))\b/i, type: 'department' },
      { pattern: /\b(dự án (đó|này|đấy))\b/i, type: 'project' },
      { pattern: /\b(team (đó|này|đấy))\b/i, type: 'team' },
      { pattern: /\b(nhóm (đó|này|đấy))\b/i, type: 'group' },
    ];

    for (const { pattern, type } of pronounPatterns) {
      if (pattern.test(query)) {
        // Find most recent entity of this type in context
        const recentEntity = this.findRecentEntityByType(context.entities, type);
        if (recentEntity) {
          resolvedEntities.set(type, {
            ...recentEntity,
            confidence: recentEntity.confidence * 0.9, // Slightly lower confidence for references
          });
          this.logger.debug(`Resolved "${query.match(pattern)?.[0]}" -> ${recentEntity.value} (${type})`);
        }
      }
    }

    return resolvedEntities;
  }

  /**
   * Extract entities từ conversation history
   */
  private extractEntitiesFromHistory(
    messages: ConversationMessage[],
  ): Map<string, EntityReference> {
    const entities = new Map<string, EntityReference>();

    messages.forEach((msg, index) => {
      if (msg.role === 'user') {
        // Simple entity extraction patterns
        const extracted = this.extractEntitiesFromMessage(msg.content, index);
        extracted.forEach((entity) => {
          // Keep most recent mention
          const key = `${entity.type}:${entity.value}`;
          if (!entities.has(key) || entities.get(key)!.sourceMessageIndex < index) {
            entities.set(key, entity);
          }
        });
      }
    });

    return entities;
  }

  /**
   * Extract entities từ một message
   */
  private extractEntitiesFromMessage(
    content: string,
    messageIndex: number,
  ): EntityReference[] {
    const entities: EntityReference[] = [];

    // Department patterns
    const deptMatch = content.match(/phòng\s+(\w+)/i);
    if (deptMatch) {
      entities.push({
        type: 'department',
        value: deptMatch[1],
        confidence: 0.8,
        sourceMessageIndex: messageIndex,
      });
    }

    // Skill patterns
    const skillMatch = content.match(/kỹ năng\s+(\w+)/i);
    if (skillMatch) {
      entities.push({
        type: 'skill',
        value: skillMatch[1],
        confidence: 0.8,
        sourceMessageIndex: messageIndex,
      });
    }

    // Project patterns
    const projectMatch = content.match(/dự án\s+(\w+)/i);
    if (projectMatch) {
      entities.push({
        type: 'project',
        value: projectMatch[1],
        confidence: 0.8,
        sourceMessageIndex: messageIndex,
      });
    }

    return entities;
  }

  /**
   * Extract current topics từ conversation
   */
  private extractCurrentTopics(messages: ConversationMessage[]): string[] {
    const topics = new Set<string>();

    // Analyze last 3 messages for topics
    const recentMessages = messages.slice(-3);

    recentMessages.forEach((msg) => {
      const content = msg.content.toLowerCase();

      // Topic keywords
      if (content.includes('nhân viên') || content.includes('employee')) {
        topics.add('employees');
      }
      if (content.includes('phòng ban') || content.includes('department')) {
        topics.add('departments');
      }
      if (content.includes('dự án') || content.includes('project')) {
        topics.add('projects');
      }
      if (content.includes('kỹ năng') || content.includes('skill')) {
        topics.add('skills');
      }
      if (content.includes('phân tích') || content.includes('analysis')) {
        topics.add('analysis');
      }
      if (content.includes('so sánh') || content.includes('compare')) {
        topics.add('comparison');
      }
    });

    return Array.from(topics);
  }

  /**
   * Detect conversation mood
   */
  private detectMood(messages: ConversationMessage[]): 'formal' | 'casual' | 'urgent' {
    if (messages.length === 0) return 'formal';

    const lastMessage = messages[messages.length - 1];
    const content = lastMessage.content.toLowerCase();

    // Urgent patterns
    if (content.includes('gấp') || content.includes('urgent') || content.includes('ngay')) {
      return 'urgent';
    }

    // Casual patterns
    if (content.includes('cho tôi') || content.includes('giúp tôi')) {
      return 'casual';
    }

    return 'formal';
  }

  /**
   * Find most recent entity by type
   */
  private findRecentEntityByType(
    entities: Map<string, EntityReference>,
    type: string,
  ): EntityReference | null {
    let recent: EntityReference | null = null;
    let maxIndex = -1;

    entities.forEach((entity) => {
      if (entity.type === type && entity.sourceMessageIndex > maxIndex) {
        recent = entity;
        maxIndex = entity.sourceMessageIndex;
      }
    });

    return recent;
  }

  /**
   * Update context sau mỗi turn
   */
  async updateContext(
    sessionId: string,
    userMessage: string,
    assistantResponse: string,
    intent?: string,
  ): Promise<void> {
    try {
      // Messages are already saved to Redis by ChatService
      // This method can be used for additional context tracking if needed
      this.logger.debug(`Context updated for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to update context: ${error}`);
    }
  }
}
