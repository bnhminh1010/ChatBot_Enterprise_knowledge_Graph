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
var AgentExecutorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentExecutorService = void 0;
const common_1 = require("@nestjs/common");
const gemini_service_1 = require("../gemini.service");
const gemini_tools_service_1 = require("../gemini-tools.service");
const agent_types_1 = require("./types/agent.types");
let AgentExecutorService = AgentExecutorService_1 = class AgentExecutorService {
    geminiToolsService;
    geminiService;
    logger = new common_1.Logger(AgentExecutorService_1.name);
    constructor(geminiToolsService, geminiService) {
        this.geminiToolsService = geminiToolsService;
        this.geminiService = geminiService;
    }
    async execute(plan) {
        const startTime = Date.now();
        this.logger.log(`🚀 Starting execution of plan: "${plan.goal}"`);
        try {
            const steps = plan.steps.map((step) => ({
                ...step,
                status: 'pending',
            }));
            const executedSteps = await this.executeSteps(steps, plan.goal);
            const executionTime = Date.now() - startTime;
            if (executionTime > agent_types_1.DEFAULT_AGENT_CONFIG.maxExecutionTime) {
                throw new Error('Execution timeout');
            }
            const finalAnswer = await this.generateFinalAnswer(plan.goal, executedSteps);
            this.logger.log(`✅ Execution completed in ${executionTime}ms with ${executedSteps.length} steps`);
            return {
                success: true,
                finalAnswer,
                steps: executedSteps,
                totalSteps: executedSteps.length,
                executionTime,
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.logger.error(`❌ Execution failed: ${error.message}`);
            return {
                success: false,
                finalAnswer: `Xin lỗi, tôi gặp lỗi khi xử lý: ${error.message}`,
                steps: [],
                totalSteps: 0,
                executionTime,
                error: error.message,
            };
        }
    }
    async executeSteps(steps, goal) {
        const executedSteps = [];
        let currentSteps = [...steps];
        for (let i = 0; i < currentSteps.length; i++) {
            const step = currentSteps[i];
            const executedStep = await this.executeStep(step);
            executedSteps.push(executedStep);
            this.logger.log(`Step ${executedStep.stepNumber}/${currentSteps.length}: ${executedStep.status}`);
            if (executedStep.status === 'failed') {
                this.logger.warn(`Step ${executedStep.stepNumber} failed, stopping execution`);
                break;
            }
            if (agent_types_1.DEFAULT_AGENT_CONFIG.enableDynamicPlanning &&
                i === currentSteps.length - 1) {
                const needsMore = await this.checkIfNeedsMoreSteps(goal, executedSteps);
                if (needsMore.continue && needsMore.newSteps.length > 0) {
                    this.logger.log(`🔄 Adding ${needsMore.newSteps.length} more steps dynamically`);
                    const newAgentSteps = needsMore.newSteps.map((ps) => ({
                        ...ps,
                        status: 'pending',
                    }));
                    currentSteps = [...currentSteps, ...newAgentSteps];
                    if (currentSteps.length > agent_types_1.DEFAULT_AGENT_CONFIG.maxSteps) {
                        this.logger.warn(`Reached max steps limit (${agent_types_1.DEFAULT_AGENT_CONFIG.maxSteps})`);
                        break;
                    }
                }
            }
        }
        return executedSteps;
    }
    async executeStep(step) {
        const startTime = Date.now();
        try {
            step.status = 'running';
            this.logger.debug(`Executing: ${step.action.tool}(${JSON.stringify(step.action.args)})`);
            const observation = await this.geminiToolsService.executeTool(step.action.tool, step.action.args);
            step.observation = observation;
            step.status = 'completed';
            step.executionTime = Date.now() - startTime;
            return step;
        }
        catch (error) {
            step.status = 'failed';
            step.error = error.message;
            step.executionTime = Date.now() - startTime;
            this.logger.error(`Step ${step.stepNumber} failed: ${error.message}`);
            return step;
        }
    }
    async checkIfNeedsMoreSteps(goal, executedSteps) {
        try {
            const prompt = this.buildContinuationPrompt(goal, executedSteps);
            const response = await this.geminiService.generateResponse(prompt, this.getContinuationSystemPrompt());
            let cleanResponse = response.trim();
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse
                    .replace(/```json\n?/g, '')
                    .replace(/```\n?/g, '');
            }
            const parsed = JSON.parse(cleanResponse);
            if (parsed.continue && Array.isArray(parsed.newSteps)) {
                const newSteps = parsed.newSteps.map((step, index) => ({
                    stepNumber: executedSteps.length + index + 1,
                    thought: step.thought,
                    action: {
                        tool: step.action.tool,
                        args: step.action.args || {},
                        reason: step.action.reason || '',
                    },
                }));
                return { continue: true, newSteps };
            }
            return { continue: false, newSteps: [] };
        }
        catch (error) {
            this.logger.warn(`Failed to check continuation: ${error.message}. Stopping execution.`);
            return { continue: false, newSteps: [] };
        }
    }
    buildContinuationPrompt(goal, executedSteps) {
        const stepsLog = executedSteps
            .map((s) => `Step ${s.stepNumber}:\n  Thought: ${s.thought}\n  Action: ${s.action.tool}(${JSON.stringify(s.action.args)})\n  Result: ${JSON.stringify(s.observation)}`)
            .join('\n\n');
        return `
Goal: "${goal}"

Executed steps so far:
${stepsLog}

QUESTION: Với thông tin đã có, có đủ để trả lời goal không?

Nếu ĐỦ: trả về {"continue": false}
Nếu CHƯA ĐỦ: trả về {"continue": true, "newSteps": [...]}

Chỉ trả về JSON, KHÔNG thêm gì khác.
`.trim();
    }
    getContinuationSystemPrompt() {
        return `
Bạn là một AI Decision Assistant.

NHIỆM VỤ: Quyết định xem có cần thêm steps để đạt goal hay không.

NGUYÊN TẮC:
1. Nếu đã có đủ thông tin → return {"continue": false}
2. Nếu thiếu thông tin quan trọng → return {"continue": true, "newSteps": [...]}
3. Không tạo redundant steps
4. Tối đa 1-2 steps thêm

LUÔN trả về JSON hợp lệ.
`.trim();
    }
    async generateFinalAnswer(goal, executedSteps) {
        try {
            const prompt = this.buildFinalAnswerPrompt(goal, executedSteps);
            const answer = await this.geminiService.generateResponse(prompt, this.getFinalAnswerSystemPrompt());
            return answer.trim();
        }
        catch (error) {
            this.logger.error(`Failed to generate final answer: ${error.message}`);
            const lastStep = executedSteps[executedSteps.length - 1];
            if (lastStep?.observation) {
                return this.formatObservation(lastStep.observation);
            }
            return 'Xin lỗi, tôi không thể tạo câu trả lời cuối cùng.';
        }
    }
    buildFinalAnswerPrompt(goal, executedSteps) {
        const stepsLog = executedSteps
            .map((s) => {
            const obsPreview = typeof s.observation === 'string'
                ? s.observation.substring(0, 500)
                : JSON.stringify(s.observation).substring(0, 500);
            return `Step ${s.stepNumber}: ${s.thought}\nAction: ${s.action.tool}\nResult: ${obsPreview}`;
        })
            .join('\n\n');
        return `
Goal: "${goal}"

Execution trace:
${stepsLog}

Hãy tổng hợp kết quả và trả lời goal của user một cách tự nhiên, rõ ràng.

REQUIREMENTS:
- Trả lời bằng tiếng Việt
- Ngắn gọn, súc tích
- Nếu có data, format đẹp (dùng bullets, numbers)
- Nếu có nhiều kết quả, show top items
`.trim();
    }
    getFinalAnswerSystemPrompt() {
        return `
Bạn là một AI Assistant cho hệ thống EKG.

NHIỆM VỤ: Tổng hợp kết quả từ các steps và tạo câu trả lời cuối cùng.

NGUYÊN TẮC:
1. Tự nhiên, thân thiện
2. Chính xác, dựa trên data
3. Format đẹp, dễ đọc
4. Không bịa thông tin
`.trim();
    }
    formatObservation(observation) {
        if (typeof observation === 'string') {
            return observation;
        }
        if (observation.message) {
            return observation.message;
        }
        if (observation.data && Array.isArray(observation.data)) {
            const items = observation.data.slice(0, 5);
            return `Tìm thấy ${observation.data.length} kết quả:\n${items.map((item, i) => `${i + 1}. ${item.name || JSON.stringify(item)}`).join('\n')}`;
        }
        return JSON.stringify(observation, null, 2);
    }
};
exports.AgentExecutorService = AgentExecutorService;
exports.AgentExecutorService = AgentExecutorService = AgentExecutorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [gemini_tools_service_1.GeminiToolsService,
        gemini_service_1.GeminiService])
], AgentExecutorService);
//# sourceMappingURL=agent-executor.service.js.map