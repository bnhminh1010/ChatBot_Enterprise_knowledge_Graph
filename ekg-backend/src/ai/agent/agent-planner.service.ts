/**
 * @fileoverview Agent Planner Service - Query Analysis & Plan Generation
 * @module ai/agent/agent-planner.service
 * 
 * Service phân tích user query và tạo execution plan theo ReAct pattern.
 * Sử dụng QueryAnalyzerService để phân tích sâu query trước khi tạo plan.
 * 
 * Tính năng:
 * - Multi-intent detection
 * - Entity extraction  
 * - Complexity assessment
 * - Dynamic tool selection
 * 
 * @see AgentExecutorService - Thực thi plan
 * @see QueryAnalyzerService - Phân tích query
 * @author APTX3107 Team
 */
import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../gemini.service';
import {
  AgentPlan,
  AgentContext,
  PlanStep,
  DEFAULT_AGENT_CONFIG,
} from './types/agent.types';
import { QueryAnalyzerService } from '../../chat/services/query-analyzer.service';
import {
  QueryAnalysisResult,
  IntentType,
} from '../../core/interfaces/query-analysis.interface';

/**
 * Service tạo execution plan từ user query.
 * Quyết định có cần tools không và tạo danh sách steps.
 * 
 * @example
 * const plan = await agentPlannerService.createPlan(query, context);
 * if (plan.needsTools) {
 *   await agentExecutorService.execute(plan);
 * } else {
 *   return plan.directAnswer;
 * }
 */
@Injectable()
export class AgentPlannerService {
  private readonly logger = new Logger(AgentPlannerService.name);

  /**
   * @param geminiService - Service gọi Gemini API
   * @param queryAnalyzer - Service phân tích query
   */
  constructor(
    private readonly geminiService: GeminiService,
    private readonly queryAnalyzer: QueryAnalyzerService,
  ) {}

  /**
   * Tạo execution plan từ user query.
   * Phân tích query trước, quyết định có cần tools không, sau đó tạo plan.
   * 
   * @param query - Câu hỏi từ user
   * @param context - Context bao gồm conversation history và available tools
   * @returns Plan với steps (nếu cần tools) hoặc directAnswer (nếu không cần)
   */
  async createPlan(
    query: string,
    context: AgentContext,
  ): Promise<
    AgentPlan & {
      needsTools?: boolean;
      directAnswer?: string;
      queryAnalysis?: QueryAnalysisResult;
    }
  > {
    this.logger.log(`📋 Creating plan for query: "${query}"`);

    try {
      // 1. Phân tích query trước
      const analysis = await this.queryAnalyzer.analyzeQuery(query, {
        conversationHistory: context.conversationHistory
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
      });

      this.logger.log(
        `🔍 Query analysis: ${analysis.mainIntent.type} (confidence: ${analysis.confidence.toFixed(2)}), complexity: ${analysis.complexity.level}`,
      );

      // 2. Handle greetings/general knowledge trực tiếp
      if (
        analysis.mainIntent.type === IntentType.GREETING ||
        analysis.mainIntent.type === IntentType.GENERAL_KNOWLEDGE
      ) {
        this.logger.log(`✅ Direct answer mode (${analysis.mainIntent.type})`);
        const directAnswer = await this.geminiService.generateResponse(
          query,
          'Trả lời ngắn gọn, thân thiện bằng tiếng Việt.',
        );
        return {
          goal: 'Trả lời trực tiếp',
          steps: [],
          estimatedTokens: 100,
          createdAt: new Date(),
          needsTools: false,
          directAnswer,
          queryAnalysis: analysis,
        };
      }

      // 3. Build planning prompt với analysis insights
      const prompt = this.buildPlanningPrompt(query, context, analysis);

      // 4. Yêu cầu Gemini tạo plan
      const response = await this.geminiService.generateResponse(
        prompt,
        this.getPlanningSystemPrompt(),
      );

      // 5. Parse response
      const parsed = this.parseResponse(response, query);

      // 6. Handle NO_TOOLS mode (fallback)
      if (parsed.needsTools === false && parsed.directAnswer) {
        this.logger.log(`✅ Direct answer mode (no tools needed)`);
        return {
          goal: parsed.goal || 'Trả lời trực tiếp',
          steps: [],
          estimatedTokens: 100,
          createdAt: new Date(),
          needsTools: false,
          directAnswer: parsed.directAnswer,
          queryAnalysis: analysis,
        };
      }

      // 7. Normal mode với tools
      const plan = this.parsePlanFromResponse(parsed, query);

      this.logger.log(
        `✅ Plan created with ${plan.steps.length} steps for goal: "${plan.goal}"`,
      );

      return { ...plan, needsTools: true, queryAnalysis: analysis };
    } catch (error) {
      this.logger.error(`Failed to create plan: ${error.message}`);
      return this.createFallbackPlan(query, context);
    }
  }

  /**
   * Tạo planning prompt cho Gemini.
   * Bao gồm query analysis insights để tạo plan chính xác hơn.
   */
  private buildPlanningPrompt(
    query: string,
    context: AgentContext,
    analysis?: QueryAnalysisResult,
  ): string {
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

    const analysisContext = analysis
      ? `

QUERY ANALYSIS (pre-processed):
- Main Intent: ${analysis.mainIntent.type} (confidence: ${analysis.mainIntent.confidence.toFixed(2)})
- Complexity: ${analysis.complexity.level} (score: ${analysis.complexity.score})
- Entities Detected: ${analysis.entities.map((e) => `${e.type}=${e.value}`).join(', ') || 'none'}
- Suggested Tools: ${analysis.suggestedTools.join(', ') || 'auto-detect'}
${analysis.ambiguities && analysis.ambiguities.length > 0 ? `- Ambiguities: ${analysis.ambiguities.join(', ')}` : ''}
`
      : '';

    return `
Phân tích user query sau và tạo execution plan:

USER QUERY: "${query}"
${conversationContext}
${analysisContext}

AVAILABLE TOOLS:
${toolsList}

⚠️ DECISION - CẦN TOOLS KHÔNG?

**KHÔNG CẦN TOOLS** (trả lời trực tiếp) nếu:
1. Greetings: "xin chào", "hello", "chào bạn", "hi"
2. Thanks: "cảm ơn", "thank you", "thanks"
3. General knowledge: "React là gì?", "Lập trình là gì?"
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
   * System prompt cho việc tạo plan.
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
   * Parse response JSON từ Gemini.
   * 
   * @param response - Raw response từ Gemini
   * @param originalQuery - Query gốc (để fallback)
   * @returns Parsed JSON object
   */
  private parseResponse(response: string, originalQuery: string): any {
    try {
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
   * Parse plan từ response khi cần tools.
   * Validate structure và enforce max steps.
   * 
   * @param parsed - Parsed JSON từ Gemini
   * @param originalQuery - Query gốc
   * @returns AgentPlan với steps
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
   * Tạo fallback plan khi có lỗi.
   * Xử lý greetings đặc biệt hoặc sử dụng tool mặc định.
   * 
   * @param query - Query gốc
   * @param context - Context
   * @returns Fallback plan
   */
  private createFallbackPlan(
    query: string,
    context: AgentContext,
  ): AgentPlan & { needsTools?: boolean; directAnswer?: string } {
    this.logger.warn('Creating fallback plan');

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
