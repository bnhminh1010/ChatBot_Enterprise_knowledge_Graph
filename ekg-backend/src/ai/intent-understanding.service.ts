import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { ConversationContext } from '../chat/services/context-manager.service';

export interface IntentResult {
  primary: string;        // 'search', 'analyze', 'compare', 'recommend', 'update', 'count'
  secondary?: string[];   // ['filter', 'sort', 'aggregate']
  confidence: number;
  slots: Record<string, any>;
  requiresContext: boolean;
  contextEntities: string[];  // Entities từ context cần thiết
  reasoning: string;
}

/**
 * Intent Understanding Service
 * Phân tích intent với context-awareness
 */
@Injectable()
export class IntentUnderstandingService {
  private readonly logger = new Logger(IntentUnderstandingService.name);

  constructor(private readonly geminiService: GeminiService) {}

  /**
   * Analyze intent với conversation context
   */
  async analyzeIntent(
    query: string,
    context: ConversationContext,
  ): Promise<IntentResult> {
    try {
      const prompt = this.buildIntentPrompt(query, context);
      const response = await this.geminiService.classifyQuery(prompt);
      const result = this.parseIntentResponse(response);

      this.logger.debug(
        `Intent analyzed: "${query}" => ${result.primary} (confidence: ${result.confidence})`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to analyze intent: ${error}`);
      // Fallback to basic intent
      return this.fallbackIntent(query);
    }
  }

  /**
   * Decompose complex query thành sub-intents
   */
  async decomposeComplexQuery(query: string): Promise<IntentResult[]> {
    const prompt = `Phân tích câu hỏi sau và chia thành các sub-intents độc lập:

Câu hỏi: "${query}"

Nếu câu hỏi có nhiều ý định (VD: "Liệt kê dự án và cho biết team nào thiếu người"),
hãy chia thành các intent riêng biệt.

Trả về JSON array:
[
  {
    "primary": "search|analyze|compare|recommend",
    "subQuery": "câu hỏi con",
    "confidence": 0.0-1.0
  }
]

Nếu chỉ có 1 intent, trả về array với 1 phần tử.`;

    try {
      const response = await this.geminiService.classifyQuery(prompt);
      const parsed = JSON.parse(this.cleanJsonResponse(response));
      
      return parsed.map((item: any) => ({
        primary: item.primary,
        secondary: [],
        confidence: item.confidence || 0.8,
        slots: { subQuery: item.subQuery },
        requiresContext: false,
        contextEntities: [],
        reasoning: `Sub-intent: ${item.subQuery}`,
      }));
    } catch (error) {
      this.logger.error(`Failed to decompose query: ${error}`);
      // Return single intent as fallback
      return [await this.analyzeIntent(query, {
        sessionId: '',
        userId: '',
        history: [],
        currentTopic: [],
        entities: new Map(),
        mood: 'formal',
      })];
    }
  }

  /**
   * Build prompt cho intent classification với context
   */
  private buildIntentPrompt(query: string, context: ConversationContext): string {
    const historyText = context.history
      .slice(-5)
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const entitiesText = Array.from(context.entities.values())
      .map((e) => `- ${e.type}: ${e.value}`)
      .join('\n');

    return `Bạn là chuyên gia phân tích intent cho hệ thống Enterprise Knowledge Graph.

CONTEXT HỘI THOẠI (5 câu gần nhất):
${historyText || 'Chưa có lịch sử'}

ENTITIES ĐÃ ĐỀ CẬP:
${entitiesText || 'Chưa có entities'}

TOPICS HIỆN TẠI: ${context.currentTopic.join(', ') || 'Chưa rõ'}

CÂU HỎI HIỆN TẠI: "${query}"

NHIỆM VỤ:
1. Xác định intent chính (primary):
   - **search**: Tìm kiếm, liệt kê, lấy thông tin
   - **analyze**: Phân tích, đánh giá, insights
   - **compare**: So sánh 2+ đối tượng
   - **recommend**: Đề xuất, gợi ý
   - **count**: Đếm số lượng
   - **update**: Cập nhật thông tin

2. Xác định sub-intents (secondary) nếu có:
   - filter, sort, aggregate, group

3. Trích xuất slots (parameters cần thiết)

4. Xác định xem có cần context không (requiresContext):
   - true nếu câu hỏi có pronouns ("họ", "đó", "này") hoặc tham chiếu đến câu trước
   - false nếu câu hỏi độc lập

5. Liệt kê entities từ context cần thiết (contextEntities)

Trả về JSON (chỉ JSON, không markdown):
{
  "primary": "search|analyze|compare|recommend|count|update",
  "secondary": ["filter", "sort"],
  "confidence": 0.0-1.0,
  "slots": {
    "department": "...",
    "skill": "...",
    "limit": 10
  },
  "requiresContext": true|false,
  "contextEntities": ["department:Frontend", "skill:Python"],
  "reasoning": "Giải thích ngắn gọn"
}`;
  }

  /**
   * Parse Gemini response thành IntentResult
   */
  private parseIntentResponse(response: string): IntentResult {
    try {
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);

      return {
        primary: parsed.primary || 'search',
        secondary: parsed.secondary || [],
        confidence: parsed.confidence || 0.8,
        slots: parsed.slots || {},
        requiresContext: parsed.requiresContext || false,
        contextEntities: parsed.contextEntities || [],
        reasoning: parsed.reasoning || 'No reasoning provided',
      };
    } catch (error) {
      this.logger.error(`Failed to parse intent response: ${error}`);
      throw new Error(`Invalid intent response format: ${error.message}`);
    }
  }

  /**
   * Clean JSON response (remove markdown code blocks)
   */
  private cleanJsonResponse(response: string): string {
    let cleaned = response.trim();
    cleaned = cleaned.replace(/^```json\s*/i, '');
    cleaned = cleaned.replace(/^```\s*/, '');
    cleaned = cleaned.replace(/\s*```$/, '');
    return cleaned.trim();
  }

  /**
   * Fallback intent khi Gemini fails
   */
  private fallbackIntent(query: string): IntentResult {
    const lowerQuery = query.toLowerCase();

    let primary = 'search';
    const slots: Record<string, any> = {};

    if (lowerQuery.includes('phân tích') || lowerQuery.includes('analyze')) {
      primary = 'analyze';
    } else if (lowerQuery.includes('so sánh') || lowerQuery.includes('compare')) {
      primary = 'compare';
    } else if (lowerQuery.includes('đề xuất') || lowerQuery.includes('recommend')) {
      primary = 'recommend';
    } else if (lowerQuery.includes('bao nhiêu') || lowerQuery.includes('count')) {
      primary = 'count';
    }

    return {
      primary,
      secondary: [],
      confidence: 0.5, // Low confidence for fallback
      slots,
      requiresContext: false,
      contextEntities: [],
      reasoning: 'Fallback intent detection',
    };
  }
}
