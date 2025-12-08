"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var QueryAnalyzerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryAnalyzerService = void 0;
const common_1 = require("@nestjs/common");
const gemini_service_1 = require("../../ai/gemini.service");
const query_analysis_interface_1 = require("../../core/interfaces/query-analysis.interface");
let QueryAnalyzerService = QueryAnalyzerService_1 = class QueryAnalyzerService {
    geminiService;
    logger = new common_1.Logger(QueryAnalyzerService_1.name);
    constructor(geminiService) {
        this.geminiService = geminiService;
    }
    async analyzeQuery(query, context) {
        const startTime = Date.now();
        this.logger.log(`🔍 Analyzing query: "${query}"`);
        try {
            const normalizedQuery = this.normalizeQuery(query);
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
            const deepResult = await this.deepAnalysisWithGemini(normalizedQuery, context);
            this.logger.log(`✅ Deep analysis complete: ${deepResult.intents.length} intent(s), ${deepResult.entities.length} entity(ies)`);
            return {
                ...deepResult,
                originalQuery: query,
                metadata: {
                    processingTime: Date.now() - startTime,
                    geminiUsed: true,
                    fallbackUsed: false,
                },
            };
        }
        catch (error) {
            this.logger.error(`Query analysis failed: ${error.message}`);
            return this.fallbackAnalysis(query);
        }
    }
    normalizeQuery(query) {
        return query
            .trim()
            .replace(/\s+/g, ' ')
            .toLowerCase();
    }
    quickAnalysis(query) {
        if (this.isGreeting(query)) {
            return this.createSimpleResult(query, query_analysis_interface_1.IntentType.GREETING, [], 1.0);
        }
        if (query.includes('bao nhiêu') || query.includes('tổng số')) {
            const entities = this.extractEntitiesFromQuery(query);
            return this.createSimpleResult(query, query_analysis_interface_1.IntentType.COUNT, entities, 0.95);
        }
        if (query.includes('danh sách') || query.includes('liệt kê')) {
            const entities = this.extractEntitiesFromQuery(query);
            return this.createSimpleResult(query, query_analysis_interface_1.IntentType.LIST, entities, 0.95);
        }
        if (query.includes('tìm') ||
            query.includes('ai biết') ||
            query.includes('có kỹ năng')) {
            const entities = this.extractEntitiesFromQuery(query);
            return this.createSimpleResult(query, query_analysis_interface_1.IntentType.SEARCH, entities, 0.9);
        }
        return null;
    }
    async deepAnalysisWithGemini(query, context) {
        const prompt = this.buildAnalysisPrompt(query, context);
        const systemPrompt = this.getAnalysisSystemPrompt();
        const response = await this.geminiService.generateResponse(prompt, systemPrompt);
        const parsed = this.parseGeminiResponse(response);
        return {
            originalQuery: query,
            normalizedQuery: query,
            intents: parsed.intents,
            mainIntent: parsed.intents[0],
            entities: parsed.entities,
            complexity: this.calculateComplexity(parsed.intents, parsed.entities),
            suggestedTools: parsed.suggestedTools,
            needsContext: parsed.needsContext || false,
            ambiguities: parsed.ambiguities,
            confidence: parsed.confidence || 0.8,
        };
    }
    buildAnalysisPrompt(query, context) {
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
    getAnalysisSystemPrompt() {
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
    parseGeminiResponse(response) {
        try {
            let cleanResponse = response.trim();
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse
                    .replace(/```json\n?/g, '')
                    .replace(/```\n?/g, '');
            }
            else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/```\n?/g, '');
            }
            const parsed = JSON.parse(cleanResponse);
            if (!parsed.intents || !Array.isArray(parsed.intents)) {
                throw new Error('Invalid intents structure');
            }
            return parsed;
        }
        catch (error) {
            this.logger.error(`Failed to parse Gemini response: ${error.message}`);
            throw error;
        }
    }
    calculateComplexity(intents, entities) {
        const multiIntent = intents.length > 1;
        const entityCount = entities.length;
        const requiresReasoning = intents.some((i) => i.type === query_analysis_interface_1.IntentType.COMPARE ||
            i.type === query_analysis_interface_1.IntentType.ANALYZE ||
            i.type === query_analysis_interface_1.IntentType.AGGREGATE);
        const requiresAggregation = intents.some((i) => i.type === query_analysis_interface_1.IntentType.COUNT ||
            i.type === query_analysis_interface_1.IntentType.AGGREGATE ||
            i.type === query_analysis_interface_1.IntentType.COMPARE);
        const requiresComparison = intents.some((i) => i.type === query_analysis_interface_1.IntentType.COMPARE);
        let score = 0;
        if (multiIntent)
            score += 30;
        score += Math.min(entityCount * 10, 30);
        if (requiresReasoning)
            score += 25;
        if (requiresAggregation)
            score += 10;
        if (requiresComparison)
            score += 5;
        let level;
        if (score < 30)
            level = 'simple';
        else if (score < 60)
            level = 'medium';
        else
            level = 'complex';
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
    extractEntitiesFromQuery(query) {
        const entities = [];
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
                    type: query_analysis_interface_1.EntityType.DEPARTMENT,
                    value: dept,
                    normalizedValue: dept.charAt(0).toUpperCase() + dept.slice(1),
                    confidence: 0.9,
                });
            }
        }
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
                    type: query_analysis_interface_1.EntityType.SKILL,
                    value: tech,
                    normalizedValue: tech.charAt(0).toUpperCase() + tech.slice(1),
                    confidence: 0.85,
                });
            }
        }
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
                    type: query_analysis_interface_1.EntityType.POSITION,
                    value: pos,
                    normalizedValue: pos.charAt(0).toUpperCase() + pos.slice(1),
                    confidence: 0.8,
                });
            }
        }
        return entities;
    }
    createSimpleResult(query, intentType, entities, confidence) {
        const intent = {
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
    fallbackAnalysis(query) {
        this.logger.warn('Using fallback analysis');
        return {
            originalQuery: query,
            normalizedQuery: this.normalizeQuery(query),
            intents: [
                {
                    type: query_analysis_interface_1.IntentType.SEARCH,
                    confidence: 0.5,
                    entities: [],
                    priority: 1,
                },
            ],
            mainIntent: {
                type: query_analysis_interface_1.IntentType.SEARCH,
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
    isGreeting(query) {
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
};
exports.QueryAnalyzerService = QueryAnalyzerService;
exports.QueryAnalyzerService = QueryAnalyzerService = QueryAnalyzerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [gemini_service_1.GeminiService])
], QueryAnalyzerService);
//# sourceMappingURL=query-analyzer.service.js.map