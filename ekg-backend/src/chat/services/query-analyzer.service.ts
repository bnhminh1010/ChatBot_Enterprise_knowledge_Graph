import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../../ai/gemini.service';
import {
  QueryAnalysisResult,
  QueryAnalysisContext,
  Intent,
  IntentType,
  Entity,
  EntityType,
  QueryComplexity,
} from '../../core/interfaces/query-analysis.interface';

/**
 * Query Analyzer Service
 * Phân tích sâu user query trước khi đưa vào agent planner
 * 
 * Features:
 * - Multi-intent detection
 * - Entity extraction với fuzzy matching
 * - Confidence scoring
 * - Vietnamese language support
 */
@Injectable()
export class QueryAnalyzerService {
  private readonly logger = new Logger(QueryAnalyzerService.name);

  constructor(private readonly geminiService: GeminiService) {}

  /**
   * Main method: Phân tích query
   */
  async analyzeQuery(
    query: string,
    context?: QueryAnalysisContext,
  ): Promise<QueryAnalysisResult> {
    const startTime = Date.now();
    this.logger.log(`🔍 Analyzing query: "${query}"`);

    try {
      // 1. Normalize query
      const normalizedQuery = this.normalizeQuery(query);

      // 2. Quick pattern matching cho simple cases
      const quickResult = this.quickAnalysis(normalizedQuery);
      if (quickResult && quickResult.confidence > 0.9) {
        this.logger.log(`✅ Quick analysis: ${quickResult.mainIntent.type}`);
        return {
          ...quickResult,
          originalQuery: query,
          metadata: {
            processingTime: Date.now() - startTime,
            geminiUsed: false,
            fallbackUsed: false,
          },
        };
      }

      // 3. Deep analysis với Gemini
      const deepResult = await this.deepAnalysisWithGemini(
        normalizedQuery,
        context,
      );

      this.logger.log(
        `✅ Deep analysis complete: ${deepResult.intents.length} intent(s), ${deepResult.entities.length} entity(ies)`,
      );

      return {
        ...deepResult,
        originalQuery: query,
        metadata: {
          processingTime: Date.now() - startTime,
          geminiUsed: true,
          fallbackUsed: false,
        },
      };
    } catch (error) {
      this.logger.error(`Query analysis failed: ${error.message}`);
      // Fallback to basic analysis
      return this.fallbackAnalysis(query);
    }
  }

  /**
   * Normalize query: lowercase, trim, remove extra spaces
   */
  private normalizeQuery(query: string): string {
    return query
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  /**
   * Quick analysis bằng pattern matching
   * Dùng cho common queries để giảm API calls
   */
  private quickAnalysis(query: string): QueryAnalysisResult | null {
    // Greeting patterns
    if (this.isGreeting(query)) {
      return this.createSimpleResult(query, IntentType.GREETING, [], 1.0);
    }

    // Count patterns: "có bao nhiêu", "tổng số"
    if (query.includes('bao nhiêu') || query.includes('tổng số')) {
      const entities = this.extractEntitiesFromQuery(query);
      return this.createSimpleResult(query, IntentType.COUNT, entities, 0.95);
    }

    // List patterns: "danh sách", "liệt kê"
    if (query.includes('danh sách') || query.includes('liệt kê')) {
      const entities = this.extractEntitiesFromQuery(query);
      return this.createSimpleResult(query, IntentType.LIST, entities, 0.95);
    }

    // Search patterns: "tìm", "ai biết", "nhân viên có"
    if (
      query.includes('tìm') ||
      query.includes('ai biết') ||
      query.includes('có kỹ năng')
    ) {
      const entities = this.extractEntitiesFromQuery(query);
      return this.createSimpleResult(query, IntentType.SEARCH, entities, 0.9);
    }

    return null; // Không match pattern nào → cần deep analysis
  }

  /**
   * Deep analysis với Gemini
   */
  private async deepAnalysisWithGemini(
    query: string,
    context?: QueryAnalysisContext,
  ): Promise<QueryAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(query, context);
    const systemPrompt = this.getAnalysisSystemPrompt();

    const response = await this.geminiService.generateResponse(
      prompt,
      systemPrompt,
    );

    // Parse JSON response
    const parsed = this.parseGeminiResponse(response);

    return {
      originalQuery: query,
      normalizedQuery: query,
      intents: parsed.intents,
      mainIntent: parsed.intents[0], // Highest priority
      entities: parsed.entities,
      complexity: this.calculateComplexity(parsed.intents, parsed.entities),
      suggestedTools: parsed.suggestedTools,
      needsContext: parsed.needsContext || false,
      ambiguities: parsed.ambiguities,
      confidence: parsed.confidence || 0.8,
    };
  }

  /**
   * Build prompt cho Gemini analysis
   */
  private buildAnalysisPrompt(
    query: string,
    context?: QueryAnalysisContext,
  ): string {
    const contextInfo = context?.conversationHistory
      ? `\n\nConversation History:\n${context.conversationHistory.map((m) => `${m.role}: ${m.content}`).join('\n')}`
      : '';

    return `
Phân tích query sau của user trong hệ thống Enterprise Knowledge Graph:

USER QUERY: "${query}"
${contextInfo}

Hãy phân tích và trả về JSON với format sau:

{
  "intents": [
    {
      "type": "count|search|get_info|list|compare|aggregate|analyze|greeting|general_knowledge|upload",
      "confidence": 0.0-1.0,
      "entities": [...],
      "requiredTools": ["tool_name"],
      "priority": 1
    }
  ],
  "entities": [
    {
      "type": "person|department|project|skill|technology|position|document|company|location|date|number",
      "value": "giá trị gốc",
      "normalizedValue": "giá trị chuẩn hóa",
      "confidence": 0.0-1.0
    }
  ],
  "suggestedTools": ["tool1", "tool2"],
  "needsContext": true/false,
  "ambiguities": ["điều chưa rõ nếu có"],
  "confidence": 0.0-1.0
}

AVAILABLE ENTITY TYPES:
- person: nhân viên, tên người
- department: phòng ban (Frontend, Backend, QA, DevOps, etc.)
- project: dự án
- skill: kỹ năng (React, Python, Java, etc.)
- technology: công nghệ
- position: chức danh (Developer, Engineer, Manager, etc.)
- document: tài liệu
- company: công ty, khách hàng
- location: địa điểm
- date: ngày tháng
- number: số lượng

INTENT DETECTION RULES:
- "có bao nhiêu", "tổng số" → count
- "danh sách", "liệt kê", "tất cả" → list
- "tìm", "ai biết", "có kỹ năng" → search
- "thông tin", "chi tiết" → get_info
- "so sánh" → compare
- "xin chào", "hello" → greeting

MULTIPLE INTENTS: Nếu query phức tạp, có thể có nhiều intents. Ví dụ:
"Có bao nhiêu nhân viên biết React ở phòng Frontend?" → [count + search]

CONFIDENCE SCORING:
- Query rõ ràng, cụ thể → 0.9-1.0
- Query mơ hồ một chút → 0.7-0.9
- Query không rõ, cần clarification → 0.5-0.7

Chỉ trả về JSON, KHÔNG thêm markdown.
`.trim();
  }

  /**
   * System prompt cho analysis
   */
  private getAnalysisSystemPrompt(): string {
    return `
Bạn là Query Analysis Expert cho Enterprise Knowledge Graph chatbot.
Nhiệm vụ: Phân tích user query thật chính xác để hệ thống có thể xử lý hiệu quả.

NGUYÊN TẮC:
1. Detect TẤT CẢ intents trong query (có thể có nhiều)
2. Extract TẤT CẢ entities với normalized values
3. Confidence scores phải chính xác
4. Suggest tools phù hợp nhất
5. Luôn trả về JSON hợp lệ, KHÔNG markdown

Vietnamese Language Support:
- Hiểu cả có dấu và không dấu
- Fuzzy matching cho tên người/phòng ban
- Context-aware (dùng conversation history)
`.trim();
  }

  /**
   * Parse Gemini response
   */
  private parseGeminiResponse(response: string): any {
    try {
      let cleanResponse = response.trim();
      // Remove markdown if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleanResponse);

      // Validate structure
      if (!parsed.intents || !Array.isArray(parsed.intents)) {
        throw new Error('Invalid intents structure');
      }

      return parsed;
    } catch (error) {
      this.logger.error(`Failed to parse Gemini response: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate query complexity
   */
  private calculateComplexity(
    intents: Intent[],
    entities: Entity[],
  ): QueryComplexity {
    const multiIntent = intents.length > 1;
    const entityCount = entities.length;
    const requiresReasoning = intents.some(
      (i) =>
        i.type === IntentType.COMPARE ||
        i.type === IntentType.ANALYZE ||
        i.type === IntentType.AGGREGATE,
    );
    const requiresAggregation = intents.some(
      (i) =>
        i.type === IntentType.COUNT ||
        i.type === IntentType.AGGREGATE ||
        i.type === IntentType.COMPARE,
    );
    const requiresComparison = intents.some(
      (i) => i.type === IntentType.COMPARE,
    );

    // Calculate score
    let score = 0;
    if (multiIntent) score += 30;
    score += Math.min(entityCount * 10, 30);
    if (requiresReasoning) score += 25;
    if (requiresAggregation) score += 10;
    if (requiresComparison) score += 5;

    // Determine level
    let level: 'simple' | 'medium' | 'complex';
    if (score < 30) level = 'simple';
    else if (score < 60) level = 'medium';
    else level = 'complex';

    return {
      level,
      score,
      factors: {
        multiIntent,
        entityCount,
        requiresReasoning,
        requiresAggregation,
        requiresComparison,
      },
    };
  }

  /**
   * Extract entities từ query bằng pattern matching
   * (Fallback khi không dùng Gemini)
   */
  private extractEntitiesFromQuery(query: string): Entity[] {
    const entities: Entity[] = [];

    // Department patterns
    const deptPatterns = [
      'frontend',
      'backend',
      'qa',
      'devops',
      'marketing',
      'hr',
      'sales',
    ];
    for (const dept of deptPatterns) {
      if (query.includes(dept)) {
        entities.push({
          type: EntityType.DEPARTMENT,
          value: dept,
          normalizedValue: dept.charAt(0).toUpperCase() + dept.slice(1),
          confidence: 0.9,
        });
      }
    }

    // Skill/Technology patterns
    const techPatterns = [
      'react',
      'python',
      'java',
      'node',
      'docker',
      'kubernetes',
      'aws',
    ];
    for (const tech of techPatterns) {
      if (query.includes(tech)) {
        entities.push({
          type: EntityType.SKILL,
          value: tech,
          normalizedValue: tech.charAt(0).toUpperCase() + tech.slice(1),
          confidence: 0.85,
        });
      }
    }

    // Position patterns
    const positionPatterns = [
      'developer',
      'engineer',
      'manager',
      'lead',
      'senior',
      'junior',
    ];
    for (const pos of positionPatterns) {
      if (query.includes(pos)) {
        entities.push({
          type: EntityType.POSITION,
          value: pos,
          normalizedValue: pos.charAt(0).toUpperCase() + pos.slice(1),
          confidence: 0.8,
        });
      }
    }

    return entities;
  }

  /**
   * Create simple result cho quick analysis
   */
  private createSimpleResult(
    query: string,
    intentType: IntentType,
    entities: Entity[],
    confidence: number,
  ): QueryAnalysisResult {
    const intent: Intent = {
      type: intentType,
      confidence,
      entities,
      priority: 1,
    };

    return {
      originalQuery: query,
      normalizedQuery: query,
      intents: [intent],
      mainIntent: intent,
      entities,
      complexity: this.calculateComplexity([intent], entities),
      suggestedTools: [],
      needsContext: false,
      confidence,
    };
  }

  /**
   * Fallback analysis khi có lỗi
   */
  private fallbackAnalysis(query: string): QueryAnalysisResult {
    this.logger.warn('Using fallback analysis');

    return {
      originalQuery: query,
      normalizedQuery: this.normalizeQuery(query),
      intents: [
        {
          type: IntentType.SEARCH,
          confidence: 0.5,
          entities: [],
          priority: 1,
        },
      ],
      mainIntent: {
        type: IntentType.SEARCH,
        confidence: 0.5,
        entities: [],
        priority: 1,
      },
      entities: [],
      complexity: {
        level: 'medium',
        score: 50,
        factors: {
          multiIntent: false,
          entityCount: 0,
          requiresReasoning: false,
          requiresAggregation: false,
          requiresComparison: false,
        },
      },
      suggestedTools: [],
      needsContext: false,
      confidence: 0.5,
      metadata: {
        processingTime: 0,
        geminiUsed: false,
        fallbackUsed: true,
      },
    };
  }

  /**
   * Check if query is greeting
   */
  private isGreeting(query: string): boolean {
    const greetings = [
      'xin chào',
      'chào',
      'hello',
      'hi',
      'chào bạn',
      'hey',
    ];
    return greetings.some((g) => query.includes(g));
  }
}
