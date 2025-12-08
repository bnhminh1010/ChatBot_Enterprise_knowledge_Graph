import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../../ai/gemini.service';

export interface SuggestedQuestion {
  question: string;
  category: 'related' | 'deeper' | 'alternative' | 'action';
  priority: number; // 1-5, higher = more relevant
}

/**
 * Service để generate suggested follow-up questions
 * Giúp user biết có thể hỏi gì tiếp theo
 *
 * Strategies:
 * 1. Entity-based: Suggest questions about entities mentioned
 * 2. Context-based: Deep dive into current topic
 * 3. Action-based: What can user do with this information
 * 4. Alternative: Different angles on same topic
 */
@Injectable()
export class SuggestedQuestionsService {
  private readonly logger = new Logger(SuggestedQuestionsService.name);

  // Common question templates by entity type
  private readonly templates = {
    employee: [
      'Thông tin chi tiết về {entity}?',
      '{entity} có những kỹ năng gì?',
      '{entity} đang làm dự án nào?',
      'Ai cùng phòng với {entity}?',
    ],
    department: [
      'Có bao nhiêu người trong phòng {entity}?',
      'Ai là manager của phòng {entity}?',
      'Phòng {entity} đang làm dự án gì?',
      'Kỹ năng phổ biến nhất ở phòng {entity}?',
    ],
    project: [
      'Ai đang làm dự án {entity}?',
      'Thông tin chi tiết về dự án {entity}?',
      'Dự án {entity} dùng công nghệ gì?',
      'Trạng thái hiện tại của dự án {entity}?',
    ],
    skill: [
      'Có bao nhiêu người biết {entity}?',
      'Ai giỏi {entity} nhất?',
      'Dự án nào cần {entity}?',
      '{entity} thường đi kèm với kỹ năng nào?',
    ],
    count: [
      'Danh sách chi tiết?',
      'So sánh với phòng ban khác?',
      'Xu hướng theo thời gian?',
    ],
    list: [
      'Thống kê tổng quan?',
      'Lọc theo tiêu chí cụ thể?',
      'Export danh sách này?',
    ],
  };

  constructor(private readonly geminiService: GeminiService) {}

  /**
   * Generate suggested questions based on response and context
   */
  async generateSuggestions(
    userQuery: string,
    assistantResponse: string,
    detectedEntities: Array<{ type: string; value: string }>,
    queryType: string,
  ): Promise<SuggestedQuestion[]> {
    const suggestions: SuggestedQuestion[] = [];

    try {
      // Strategy 1: Template-based suggestions từ entities
      for (const entity of detectedEntities.slice(0, 2)) {
        const templates =
          this.templates[entity.type as keyof typeof this.templates];
        if (templates) {
          const randomTemplate =
            templates[Math.floor(Math.random() * templates.length)];
          suggestions.push({
            question: randomTemplate.replace('{entity}', entity.value),
            category: 'related',
            priority: 4,
          });
        }
      }

      // Strategy 2: Query type-based suggestions
      if (queryType.includes('count')) {
        suggestions.push({
          question: 'Xem danh sách chi tiết?',
          category: 'deeper',
          priority: 5,
        });
      } else if (queryType.includes('list') || queryType.includes('search')) {
        suggestions.push({
          question: 'Lọc theo tiêu chí khác?',
          category: 'alternative',
          priority: 3,
        });
      }

      // Strategy 3: Action-based suggestions
      if (
        assistantResponse.includes('nhân viên') ||
        assistantResponse.includes('người')
      ) {
        suggestions.push({
          question: 'Xem kỹ năng của họ?',
          category: 'action',
          priority: 4,
        });
      }

      // Strategy 4: LLM-based suggestions (for complex cases)
      if (suggestions.length < 2 && userQuery.length > 30) {
        const llmSuggestions = await this.generateWithLLM(
          userQuery,
          assistantResponse,
        );
        suggestions.push(...llmSuggestions);
      }

      // Deduplicate và sort by priority
      const unique = this.deduplicateSuggestions(suggestions);
      return unique.sort((a, b) => b.priority - a.priority).slice(0, 3);
    } catch (error) {
      this.logger.warn(`Error generating suggestions: ${error}`);
      return this.getFallbackSuggestions();
    }
  }

  /**
   * Generate suggestions using Gemini (for complex queries)
   */
  private async generateWithLLM(
    userQuery: string,
    assistantResponse: string,
  ): Promise<SuggestedQuestion[]> {
    try {
      const prompt = `Dựa trên cuộc hội thoại sau, đề xuất 2 câu hỏi follow-up ngắn gọn (dưới 50 ký tự mỗi câu).

User hỏi: "${userQuery}"
Trợ lý trả lời: "${assistantResponse.substring(0, 300)}..."

Trả về JSON array với format:
[{"question": "câu hỏi 1"}, {"question": "câu hỏi 2"}]

Chỉ trả về JSON, không có text khác.`;

      const response = await this.geminiService.generateResponse(
        prompt,
        'Bạn là AI assistant giúp đề xuất câu hỏi.',
      );

      // Parse response
      const cleaned = response
        .replace(/```json\s*/, '')
        .replace(/```\s*$/, '')
        .trim();
      const parsed = JSON.parse(cleaned) as Array<{ question: string }>;

      return parsed.map((p) => ({
        question: p.question,
        category: 'deeper' as const,
        priority: 3,
      }));
    } catch (error) {
      this.logger.warn(`LLM suggestion failed: ${error}`);
      return [];
    }
  }

  /**
   * Fallback suggestions when other methods fail
   */
  private getFallbackSuggestions(): SuggestedQuestion[] {
    return [
      {
        question: 'Thống kê tổng quan hệ thống?',
        category: 'alternative',
        priority: 2,
      },
      {
        question: 'Danh sách nhân viên?',
        category: 'alternative',
        priority: 2,
      },
    ];
  }

  /**
   * Remove duplicate suggestions
   */
  private deduplicateSuggestions(
    suggestions: SuggestedQuestion[],
  ): SuggestedQuestion[] {
    const seen = new Set<string>();
    return suggestions.filter((s) => {
      const normalized = s.question
        .toLowerCase()
        .replace(/[?!.,]/g, '')
        .trim();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }

  /**
   * Quick suggestions without LLM (fast, deterministic)
   */
  generateQuickSuggestions(
    queryType: string,
    mentionedEntities: string[],
  ): SuggestedQuestion[] {
    const suggestions: SuggestedQuestion[] = [];

    // Based on query type
    if (queryType.includes('employee') || queryType.includes('nhân viên')) {
      suggestions.push(
        { question: 'Tổng số nhân viên?', category: 'related', priority: 4 },
        {
          question: 'Nhân viên theo phòng ban?',
          category: 'alternative',
          priority: 3,
        },
      );
    }

    if (queryType.includes('project') || queryType.includes('dự án')) {
      suggestions.push(
        { question: 'Dự án đang active?', category: 'related', priority: 4 },
        {
          question: 'Dự án nào có nhiều người nhất?',
          category: 'deeper',
          priority: 3,
        },
      );
    }

    if (queryType.includes('skill') || queryType.includes('kỹ năng')) {
      suggestions.push(
        {
          question: 'Kỹ năng phổ biến nhất?',
          category: 'related',
          priority: 4,
        },
        {
          question: 'Ai có nhiều kỹ năng nhất?',
          category: 'deeper',
          priority: 3,
        },
      );
    }

    // Generic suggestions
    if (suggestions.length === 0) {
      suggestions.push(
        { question: 'Thống kê nhân sự?', category: 'alternative', priority: 2 },
        { question: 'Danh sách dự án?', category: 'alternative', priority: 2 },
      );
    }

    return suggestions.slice(0, 3);
  }
}
