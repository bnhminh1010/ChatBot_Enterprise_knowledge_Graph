import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../gemini.service';
import {
  AgentPlan,
  AgentContext,
  PlanStep,
  DEFAULT_AGENT_CONFIG,
} from './types/agent.types';

/**
 * Agent Planner Service
 * Phân tích user query và tạo execution plan với ReAct pattern
 *
 * NEW: Hỗ trợ NO_TOOLS mode cho greetings và general knowledge
 */
@Injectable()
export class AgentPlannerService {
  private readonly logger = new Logger(AgentPlannerService.name);

  constructor(private readonly geminiService: GeminiService) {}

  /**
   * Tạo execution plan từ user query
   */
  async createPlan(
    query: string,
    context: AgentContext,
  ): Promise<AgentPlan & { needsTools?: boolean; directAnswer?: string }> {
    this.logger.log(`📋 Creating plan for query: "${query}"`);

    try {
      // 1. Build planning prompt
      const prompt = this.buildPlanningPrompt(query, context);

      // 2. Ask Gemini to create plan
      const response = await this.geminiService.generateResponse(
        prompt,
        this.getPlanningSystemPrompt(),
      );

      // 3. Parse response
      const parsed = this.parseResponse(response, query);

      // 4. Handle NO_TOOLS mode
      if (parsed.needsTools === false && parsed.directAnswer) {
        this.logger.log(`✅ Direct answer mode (no tools needed)`);
        return {
          goal: parsed.goal || 'Trả lời trực tiếp',
          steps: [],
          estimatedTokens: 100,
          createdAt: new Date(),
          needsTools: false,
          directAnswer: parsed.directAnswer,
        };
      }

      // 5. Normal mode with tools
      const plan = this.parsePlanFromResponse(parsed, query);

      this.logger.log(
        `✅ Plan created with ${plan.steps.length} steps for goal: "${plan.goal}"`,
      );

      return { ...plan, needsTools: true };
    } catch (error) {
      this.logger.error(`Failed to create plan: ${error.message}`);
      // Fallback: Create simple plan
      return this.createFallbackPlan(query, context);
    }
  }

  /**
   * Build planning prompt cho Gemini (with NO_TOOLS support)
   */
  private buildPlanningPrompt(query: string, context: AgentContext): string {
    const toolsList = context.availableTools
      .map(
        (t) =>
          `- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters.properties)}`,
      )
      .join('\n\n');

    const conversationContext =
      context.conversationHistory.length > 0
        ? `\n\nConversation History (last ${context.conversationHistory.length} messages):\n${context.conversationHistory.map((m) => `${m.role}: ${m.content}`).join('\n')}`
        : '';

    return `
Phân tích user query sau và quyết định cách xử lý:

USER QUERY: "${query}"
${conversationContext}

AVAILABLE TOOLS:
${toolsList}

⚠️ DECISION FIRST - CÓ CẦN TOOLS KHÔNG?

**KHÔNG CẦN TOOLS** (trả lời trực tiếp) nếu:
1. Greetings: "xin chào", "hello", "chào bạn", "hi"
2. Thanks: "cảm ơn", "thank you", "thanks"
3. General knowledge: "React là g㧔", "Lập trình là gì?"
4. Casual chat: không liên quan đến data công ty

**CẦN TOOLS** nếu:
1. Yêu cầu data từ hệ thống: "danh sách nhân viên", "ai biết Python?"
2. Search/filter: "tìm...", "có bao nhiêu..."
3. Specific info: "thông tin nhân viên X"

FORMAT TRẢ VỀ:

**Nếu KHÔNG CẦN TOOLS:**
{
  "needsTools": false,
  "directAnswer": "Câu trả lời đầy đủ ở đây (tiếng Việt)",
  "goal": "Trả lời [loại query]"
}

**Nếu CẦN TOOLS:**
{
  "needsTools": true,
  "goal": "Mục tiêu cần đạt",
  "steps": [
    {
      "stepNumber": 1,
      "thought": "Suy nghĩ",
      "action": {
        "tool": "tool_name",
        "args": {"arg": "value"},
        "reason": "Lý do"
      }
    }
  ],
  "estimatedTokens": 500
}

LUÔN trả về JSON hợp lệ, KHÔNG markdown.
`.trim();
  }

  /**
   * System prompt cho planning
   */
  private getPlanningSystemPrompt(): string {
    return `
Bạn là AI Planning Assistant cho hệ thống EKG chatbot.

NHIỆM VỤ: Quyết định có cần tools không, nếu cần thì tạo plan.

NGUYÊN TẮC:
1. Ưu tiên trả lời trực tiếp nếu có thể (greetings, general knowledge)
2. Chỉ dùng tools khi CẦN DATA từ hệ thống
3. Tối giản steps (1-3 steps ideal)
4. Luôn trả về JSON hợp lệ

LUÔN trả về JSON, KHÔNG thêm markdown backticks.
`.trim();
  }

  /**
   * Parse Gemini response
   */
  private parseResponse(response: string, originalQuery: string): any {
    try {
      // Clean response
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/g, '');
      }

      return JSON.parse(cleanResponse);
    } catch (error) {
      this.logger.error(`Failed to parse response: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse plan từ response (for tools mode)
   */
  private parsePlanFromResponse(parsed: any, originalQuery: string): AgentPlan {
    try {
      if (!parsed.goal || !Array.isArray(parsed.steps)) {
        throw new Error('Invalid plan structure');
      }

      const steps: PlanStep[] = parsed.steps.map((step: any, index: number) => {
        if (!step.thought || !step.action) {
          throw new Error(`Invalid step ${index + 1}`);
        }

        return {
          stepNumber: step.stepNumber || index + 1,
          thought: step.thought,
          action: {
            tool: step.action.tool,
            args: step.action.args || {},
            reason: step.action.reason || 'No reason provided',
          },
        };
      });

      // Enforce max steps
      if (steps.length > DEFAULT_AGENT_CONFIG.maxSteps) {
        this.logger.warn(`Limiting to ${DEFAULT_AGENT_CONFIG.maxSteps} steps`);
        steps.splice(DEFAULT_AGENT_CONFIG.maxSteps);
      }

      return {
        goal: parsed.goal,
        steps,
        estimatedTokens: parsed.estimatedTokens || 1000,
        createdAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to parse plan: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fallback plan khi có lỗi
   */
  private createFallbackPlan(
    query: string,
    context: AgentContext,
  ): AgentPlan & { needsTools?: boolean; directAnswer?: string } {
    this.logger.warn('Creating fallback plan');

    // Check if greeting
    const lowerQuery = query.toLowerCase();
    if (
      lowerQuery.includes('xin chào') ||
      lowerQuery.includes('hello') ||
      lowerQuery.includes('hi') ||
      lowerQuery.includes('chào')
    ) {
      return {
        goal: 'Greeting',
        steps: [],
        estimatedTokens: 50,
        createdAt: new Date(),
        needsTools: false,
        directAnswer:
          'Xin chào! Tôi là trợ lý AI của hệ thống EKG. Tôi có thể giúp gì cho bạn?',
      };
    }

    // Default: try to use a tool
    return {
      goal: `Trả lời: ${query}`,
      steps: [
        {
          stepNumber: 1,
          thought: 'Thử tìm kiếm thông tin với tool mặc định',
          action: {
            tool: 'search_employees',
            args: {},
            reason: 'Fallback: sử dụng tool mặc định',
          },
        },
      ],
      estimatedTokens: 500,
      createdAt: new Date(),
      needsTools: true,
    };
  }
}
