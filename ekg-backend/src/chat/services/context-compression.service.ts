import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../../ai/gemini.service';
import { ConversationMessage } from './redis-conversation.service';

export interface CompressedContext {
  summary: string; // Summarized older messages
  recentMessages: ConversationMessage[]; // Recent messages (unmodified)
  keyEntities: ExtractedEntity[]; // Important entities from conversation
  tokenEstimate: number; // Estimated token count
}

export interface ExtractedEntity {
  type: 'person' | 'department' | 'project' | 'skill' | 'document' | 'date';
  value: string;
  mentions: number; // How many times mentioned
  lastMentioned: number; // Timestamp
}

/**
 * Context Compression Service
 * Phase 3: Optimize conversation context for LLM processing
 *
 * Features:
 * - Sliding window: Keep N recent messages intact
 * - Summarization: Compress older messages into summary
 * - Entity extraction: Track important entities across conversation
 * - Token estimation: Stay within LLM context limits
 */
@Injectable()
export class ContextCompressionService {
  private readonly logger = new Logger(ContextCompressionService.name);

  // Configuration
  private readonly RECENT_MESSAGES_COUNT = 6; // Keep last 6 messages uncompressed
  private readonly MAX_CONTEXT_TOKENS = 4000; // Target max tokens for context
  private readonly SUMMARY_TRIGGER_COUNT = 10; // Summarize when > 10 messages

  constructor(private readonly geminiService: GeminiService) {}

  /**
   * Compress conversation context for LLM consumption
   * Uses sliding window + summarization strategy
   */
  async compressContext(
    messages: ConversationMessage[],
    options?: {
      maxTokens?: number;
      forceRefresh?: boolean;
    },
  ): Promise<CompressedContext> {
    const maxTokens = options?.maxTokens || this.MAX_CONTEXT_TOKENS;

    // Quick path: If few messages, no compression needed
    if (messages.length <= this.RECENT_MESSAGES_COUNT) {
      return {
        summary: '',
        recentMessages: messages,
        keyEntities: this.extractEntities(messages),
        tokenEstimate: this.estimateTokens(messages),
      };
    }

    // Split: older messages for summarization, recent messages kept intact
    const olderMessages = messages.slice(0, -this.RECENT_MESSAGES_COUNT);
    const recentMessages = messages.slice(-this.RECENT_MESSAGES_COUNT);

    // Generate summary of older messages
    let summary = '';
    if (
      olderMessages.length >=
      this.SUMMARY_TRIGGER_COUNT - this.RECENT_MESSAGES_COUNT
    ) {
      summary = await this.summarizeMessages(olderMessages);
    } else {
      // Just concatenate older messages briefly
      summary = this.quickSummarize(olderMessages);
    }

    // Extract key entities from entire conversation
    const keyEntities = this.extractEntities(messages);

    // Estimate tokens
    const tokenEstimate =
      this.estimateTokens(recentMessages) +
      this.estimateStringTokens(summary) +
      keyEntities.length * 10; // ~10 tokens per entity

    this.logger.debug(
      `Compressed ${messages.length} messages: ` +
        `summary=${summary.length} chars, ` +
        `recent=${recentMessages.length}, ` +
        `entities=${keyEntities.length}, ` +
        `tokens≈${tokenEstimate}`,
    );

    return {
      summary,
      recentMessages,
      keyEntities,
      tokenEstimate,
    };
  }

  /**
   * Deep summarization using Gemini (for long conversations)
   */
  private async summarizeMessages(
    messages: ConversationMessage[],
  ): Promise<string> {
    try {
      const conversationText = messages
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');

      const prompt = `Tóm tắt cuộc hội thoại sau thành 2-3 câu ngắn gọn. 
Giữ lại thông tin quan trọng như: tên người, phòng ban, dự án, kỹ năng được đề cập.

Cuộc hội thoại:
${conversationText}

Tóm tắt:`;

      const summary = await this.geminiService.generateResponse(
        prompt,
        'Bạn là một AI assistant chuyên tóm tắt hội thoại. Trả lời ngắn gọn, súc tích bằng tiếng Việt.',
      );

      return summary.trim();
    } catch (error) {
      this.logger.warn(
        `Summarization failed: ${error.message}, using fallback`,
      );
      return this.quickSummarize(messages);
    }
  }

  /**
   * Quick summarization (no LLM call) - fallback
   */
  private quickSummarize(messages: ConversationMessage[]): string {
    if (messages.length === 0) return '';

    // Extract key points from conversation
    const userQueries = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content.substring(0, 100))
      .slice(-3); // Last 3 user queries

    if (userQueries.length === 0) return '';

    return `Trước đó user đã hỏi về: ${userQueries.join('; ')}`;
  }

  /**
   * Extract important entities from conversation
   */
  private extractEntities(messages: ConversationMessage[]): ExtractedEntity[] {
    const entityMap = new Map<string, ExtractedEntity>();

    // Patterns for entity detection
    const patterns = {
      person:
        /(?:nhân viên|người|anh|chị|em)\s+([A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+(?:\s+[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+)*)/gi,
      department: /(?:phòng|department|team|bộ phận)\s+([A-Za-z]+)/gi,
      project: /(?:dự án|project)\s+([A-Za-z0-9]+)/gi,
      skill: /(?:biết|skill|kỹ năng)\s+([A-Za-z0-9#.+]+)/gi,
    };

    messages.forEach((msg) => {
      const content = msg.content;
      const timestamp = msg.timestamp;

      // Extract each entity type
      for (const [type, pattern] of Object.entries(patterns)) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const value = match[1].toLowerCase().trim();
          const key = `${type}:${value}`;

          if (entityMap.has(key)) {
            const entity = entityMap.get(key)!;
            entity.mentions++;
            entity.lastMentioned = timestamp;
          } else {
            entityMap.set(key, {
              type: type as ExtractedEntity['type'],
              value,
              mentions: 1,
              lastMentioned: timestamp,
            });
          }
        }
      }
    });

    // Sort by mentions (most mentioned first) and return top 10
    return Array.from(entityMap.values())
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 10);
  }

  /**
   * Estimate token count for messages
   */
  private estimateTokens(messages: ConversationMessage[]): number {
    // Rough estimation: ~0.75 tokens per character for Vietnamese
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.ceil(totalChars * 0.75);
  }

  /**
   * Estimate token count for string
   */
  private estimateStringTokens(text: string): number {
    return Math.ceil(text.length * 0.75);
  }

  /**
   * Build optimized context string for LLM
   */
  buildContextPrompt(compressed: CompressedContext): string {
    const parts: string[] = [];

    // Add summary of older messages if exists
    if (compressed.summary) {
      parts.push(`📋 Tóm tắt cuộc hội thoại trước: ${compressed.summary}`);
    }

    // Add key entities if any
    if (compressed.keyEntities.length > 0) {
      const entityList = compressed.keyEntities
        .map((e) => `${e.type}: ${e.value}`)
        .join(', ');
      parts.push(`🔑 Các thực thể đã đề cập: ${entityList}`);
    }

    // Add recent messages
    if (compressed.recentMessages.length > 0) {
      parts.push('📝 Cuộc hội thoại gần đây:');
      compressed.recentMessages.forEach((m) => {
        const role = m.role === 'user' ? 'User' : 'Assistant';
        parts.push(`${role}: ${m.content}`);
      });
    }

    return parts.join('\n\n');
  }
}
