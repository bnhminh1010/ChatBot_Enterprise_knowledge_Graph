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
var AgentPlannerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentPlannerService = void 0;
const common_1 = require("@nestjs/common");
const gemini_service_1 = require("../gemini.service");
const agent_types_1 = require("./types/agent.types");
const query_analyzer_service_1 = require("../../chat/services/query-analyzer.service");
const query_analysis_interface_1 = require("../../core/interfaces/query-analysis.interface");
let AgentPlannerService = AgentPlannerService_1 = class AgentPlannerService {
    geminiService;
    queryAnalyzer;
    logger = new common_1.Logger(AgentPlannerService_1.name);
    constructor(geminiService, queryAnalyzer) {
        this.geminiService = geminiService;
        this.queryAnalyzer = queryAnalyzer;
    }
    async createPlan(query, context) {
        this.logger.log(`📋 Creating plan for query: "${query}"`);
        try {
            const analysis = await this.queryAnalyzer.analyzeQuery(query, {
                conversationHistory: context.conversationHistory
                    .filter((m) => m.role !== 'system')
                    .map((m) => ({
                    role: m.role,
                    content: m.content,
                })),
            });
            this.logger.log(`🔍 Query analysis: ${analysis.mainIntent.type} (confidence: ${analysis.confidence.toFixed(2)}), complexity: ${analysis.complexity.level}`);
            if (analysis.mainIntent.type === query_analysis_interface_1.IntentType.GREETING ||
                analysis.mainIntent.type === query_analysis_interface_1.IntentType.GENERAL_KNOWLEDGE) {
                this.logger.log(`✅ Direct answer mode (${analysis.mainIntent.type})`);
                const directAnswer = await this.geminiService.generateResponse(query, 'Trả lời ngắn gọn, thân thiện bằng tiếng Việt.');
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
            const prompt = this.buildPlanningPrompt(query, context, analysis);
            const response = await this.geminiService.generateResponse(prompt, this.getPlanningSystemPrompt());
            const parsed = this.parseResponse(response, query);
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
            const plan = this.parsePlanFromResponse(parsed, query);
            this.logger.log(`✅ Plan created with ${plan.steps.length} steps for goal: "${plan.goal}"`);
            return { ...plan, needsTools: true, queryAnalysis: analysis };
        }
        catch (error) {
            this.logger.error(`Failed to create plan: ${error.message}`);
            return this.createFallbackPlan(query, context);
        }
    }
    buildPlanningPrompt(query, context, analysis) {
        const toolsList = context.availableTools
            .map((t) => `- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters.properties)}`)
            .join('\n\n');
        const conversationContext = context.conversationHistory.length > 0
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
    getPlanningSystemPrompt() {
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
    parseResponse(response, originalQuery) {
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
            return JSON.parse(cleanResponse);
        }
        catch (error) {
            this.logger.error(`Failed to parse response: ${error.message}`);
            throw error;
        }
    }
    parsePlanFromResponse(parsed, originalQuery) {
        try {
            if (!parsed.goal || !Array.isArray(parsed.steps)) {
                throw new Error('Invalid plan structure');
            }
            const steps = parsed.steps.map((step, index) => {
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
            if (steps.length > agent_types_1.DEFAULT_AGENT_CONFIG.maxSteps) {
                this.logger.warn(`Limiting to ${agent_types_1.DEFAULT_AGENT_CONFIG.maxSteps} steps`);
                steps.splice(agent_types_1.DEFAULT_AGENT_CONFIG.maxSteps);
            }
            return {
                goal: parsed.goal,
                steps,
                estimatedTokens: parsed.estimatedTokens || 1000,
                createdAt: new Date(),
            };
        }
        catch (error) {
            this.logger.error(`Failed to parse plan: ${error.message}`);
            throw error;
        }
    }
    createFallbackPlan(query, context) {
        this.logger.warn('Creating fallback plan');
        const lowerQuery = query.toLowerCase();
        if (lowerQuery.includes('xin chào') ||
            lowerQuery.includes('hello') ||
            lowerQuery.includes('hi') ||
            lowerQuery.includes('chào')) {
            return {
                goal: 'Greeting',
                steps: [],
                estimatedTokens: 50,
                createdAt: new Date(),
                needsTools: false,
                directAnswer: 'Xin chào! Tôi là trợ lý AI của hệ thống EKG. Tôi có thể giúp gì cho bạn?',
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
};
exports.AgentPlannerService = AgentPlannerService;
exports.AgentPlannerService = AgentPlannerService = AgentPlannerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [gemini_service_1.GeminiService,
        query_analyzer_service_1.QueryAnalyzerService])
], AgentPlannerService);
//# sourceMappingURL=agent-planner.service.js.map