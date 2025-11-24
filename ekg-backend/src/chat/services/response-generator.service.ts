import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../../ai/gemini.service';
import { IntentResult } from '../../ai/intent-understanding.service';
import { ConversationContext } from './context-manager.service';
import { QueryPlan } from './query-planner.service';

/**
 * Response Generator Service
 * Generate natural language responses thay vì structured bullet points
 */
@Injectable()
export class ResponseGeneratorService {
  private readonly logger = new Logger(ResponseGeneratorService.name);

  constructor(private readonly geminiService: GeminiService) {}

  /**
   * Generate natural response từ data
   */
  async generate(
    data: any,
    intent: IntentResult,
    context: ConversationContext,
    plan?: QueryPlan,
  ): Promise<string> {
    try {
      // If data is already a string (from complex query handler), return it
      if (typeof data === 'string') {
        return await this.enhanceResponse(data, intent, context);
      }

      const prompt = this.buildResponsePrompt(data, intent, context, plan);
      const response = await this.geminiService.generateResponse(
        prompt,
        'Bạn là trợ lý AI thông minh cho hệ thống HR APTX3107.',
      );

      // Add follow-up suggestions
      const withFollowUps = await this.addFollowUpSuggestions(response, context, intent);

      this.logger.debug(`Generated natural response for intent: ${intent.primary}`);
      return withFollowUps;
    } catch (error) {
      this.logger.error(`Failed to generate response: ${error}`);
      // Fallback to structured response
      return this.fallbackStructuredResponse(data, intent);
    }
  }

  /**
   * Build prompt cho response generation
   */
  private buildResponsePrompt(
    data: any,
    intent: IntentResult,
    context: ConversationContext,
    plan?: QueryPlan,
  ): string {
    const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
    const historyStr = context.history
      .slice(-3)
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    return `Bạn là trợ lý AI thông minh của hệ thống HR doanh nghiệp APTX3107.

DỮ LIỆU TỪ DATABASE:
\`\`\`json
${dataStr}
\`\`\`

CONTEXT HỘI THOẠI:
${historyStr || 'Chưa có lịch sử'}

USER INTENT: ${intent.primary}
TOPICS: ${context.currentTopic.join(', ') || 'Chưa rõ'}
MOOD: ${context.mood}

NHIỆM VỤ:
1. **Tóm tắt dữ liệu bằng ngôn ngữ tự nhiên** - KHÔNG liệt kê bullet points trừ khi dữ liệu quá nhiều
2. **Highlight insights quan trọng** - Sử dụng **Bold** cho điểm chính
3. **Giải thích lý do** nếu là analysis/recommendation
4. **Sử dụng emoji phù hợp** (📊 👥 💡 🎯 ⚠️ ✅) để làm rõ ý
5. **Markdown formatting**: 
   - \`Code\` cho tên entities (nhân viên, phòng ban, kỹ năng)
   - **Bold** cho số liệu quan trọng
   - Tables nếu so sánh nhiều items

STYLE:
- ${context.mood === 'formal' ? 'Chuyên nghiệp, súc tích' : 'Thân thiện, dễ hiểu'}
- Tiếng Việt tự nhiên, giống con người
- Đoạn văn ngắn (2-3 câu/đoạn)
- Kết thúc bằng insight hoặc câu hỏi mở

KHÔNG:
- Bịa đặt thông tin không có trong data
- Dùng "Dựa trên dữ liệu trên..." (redundant)
- Liệt kê tất cả items nếu quá 5 (chỉ highlight top items)

Hãy trả lời natural và insightful:`;
  }

  /**
   * Enhance existing response với formatting và insights
   */
  private async enhanceResponse(
    response: string,
    intent: IntentResult,
    context: ConversationContext,
  ): Promise<string> {
    // If response is already well-formatted, just add follow-ups
    if (response.includes('**') || response.includes('`')) {
      return await this.addFollowUpSuggestions(response, context, intent);
    }

    // Otherwise, enhance it
    const prompt = `Cải thiện response sau để tự nhiên và professional hơn:

RESPONSE GỐC:
${response}

NHIỆM VỤ:
1. Format lại với Markdown (\`code\`, **bold**, emoji)
2. Thêm insights nếu có thể
3. Giữ nguyên ý nghĩa, chỉ cải thiện presentation

Trả về response đã cải thiện:`;

    try {
      const enhanced = await this.geminiService.generateResponse(
        prompt,
        'Bạn là chuyên gia UX writing.',
      );
      return await this.addFollowUpSuggestions(enhanced, context, intent);
    } catch (error) {
      // Return original if enhancement fails
      return await this.addFollowUpSuggestions(response, context, intent);
    }
  }

  /**
   * Add follow-up suggestions
   */
  private async addFollowUpSuggestions(
    response: string,
    context: ConversationContext,
    intent: IntentResult,
  ): Promise<string> {
    const suggestions = this.generateFollowUpSuggestions(context, intent);
    
    if (suggestions.length === 0) {
      return response;
    }

    const followUpSection = `\n\n---\n\n💡 **Câu hỏi gợi ý:**\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    
    return response + followUpSection;
  }

  /**
   * Generate follow-up suggestions dựa trên context
   */
  private generateFollowUpSuggestions(
    context: ConversationContext,
    intent: IntentResult,
  ): string[] {
    const suggestions: string[] = [];
    const topics = context.currentTopic;

    if (intent.primary === 'search') {
      if (topics.includes('employees')) {
        suggestions.push('Bạn muốn xem chi tiết kỹ năng của những người này không?');
        suggestions.push('Hoặc tôi có thể phân tích gap skills của team?');
      }
      if (topics.includes('departments')) {
        suggestions.push('Bạn có muốn so sánh hiệu suất các phòng ban không?');
      }
    }

    if (intent.primary === 'analyze') {
      suggestions.push('Bạn có muốn xem đề xuất cải thiện không?');
      suggestions.push('Tôi có thể so sánh với các phòng ban khác?');
    }

    if (intent.primary === 'compare') {
      suggestions.push('Bạn có muốn đề xuất các hành động cụ thể không?');
    }

    // Generic suggestions based on topics
    if (topics.includes('skills') && !suggestions.length) {
      suggestions.push('Bạn có muốn xem training plan cho team không?');
    }

    // Limit to 2-3 suggestions
    return suggestions.slice(0, 3);
  }

  /**
   * Fallback structured response nếu Gemini fails
   */
  private fallbackStructuredResponse(data: any, intent: IntentResult): string {
    if (Array.isArray(data)) {
      const count = data.length;
      const items = data
        .slice(0, 5)
        .map((item, i) => `${i + 1}. ${item.name || JSON.stringify(item)}`)
        .join('\n');
      
      return `Tìm thấy ${count} kết quả:\n\n${items}${count > 5 ? `\n\n... và ${count - 5} kết quả khác` : ''}`;
    }

    if (typeof data === 'object') {
      return `Kết quả:\n${JSON.stringify(data, null, 2)}`;
    }

    return String(data);
  }

  /**
   * Add explanation về reasoning process
   */
  async addExplanation(response: string, plan: QueryPlan): Promise<string> {
    if (!plan || plan.steps.length <= 1) {
      return response;
    }

    const explanation = `\n\n🔍 **Chi tiết xử lý:**\n` +
      plan.steps.map((step, i) => `${i + 1}. ${step.type} từ ${step.dataSource}`).join('\n');

    return response + explanation;
  }
}
