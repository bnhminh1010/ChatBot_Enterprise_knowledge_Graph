import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../gemini.service';
import { GeminiToolsService } from '../gemini-tools.service';
import {
  AgentPlan,
  AgentStep,
  AgentResult,
  AgentStepStatus,
  DEFAULT_AGENT_CONFIG,
  PlanStep,
} from './types/agent.types';

/**
 * Agent Executor Service
 * Thực thi agent plan theo ReAct pattern
 * (Reasoning → Action → Observation)
 */
@Injectable()
export class AgentExecutorService {
  private readonly logger = new Logger(AgentExecutorService.name);

  constructor(
    private readonly geminiToolsService: GeminiToolsService,
    private readonly geminiService: GeminiService,
  ) {}

  /**
   * Execute agent plan
   */
  async execute(plan: AgentPlan): Promise<AgentResult> {
    const startTime = Date.now();
    this.logger.log(`🚀 Starting execution of plan: "${plan.goal}"`);

    try {
      // Convert PlanSteps to AgentSteps
      const steps: AgentStep[] = plan.steps.map((step) => ({
        ...step,
        status: 'pending' as AgentStepStatus,
      }));

      // Execute steps sequentially
      const executedSteps = await this.executeSteps(steps, plan.goal);

      // Check if execution timed out
      const executionTime = Date.now() - startTime;
      if (executionTime > DEFAULT_AGENT_CONFIG.maxExecutionTime) {
        throw new Error('Execution timeout');
      }

      // Generate final answer
      const finalAnswer = await this.generateFinalAnswer(
        plan.goal,
        executedSteps,
      );

      this.logger.log(
        `✅ Execution completed in ${executionTime}ms with ${executedSteps.length} steps`,
      );

      return {
        success: true,
        finalAnswer,
        steps: executedSteps,
        totalSteps: executedSteps.length,
        executionTime,
      };
    } catch (error) {
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

  /**
   * Execute steps theo thứ tự
   */
  private async executeSteps(
    steps: AgentStep[],
    goal: string,
  ): Promise<AgentStep[]> {
    const executedSteps: AgentStep[] = [];
    let currentSteps = [...steps];

    for (let i = 0; i < currentSteps.length; i++) {
      const step = currentSteps[i];

      // Execute step
      const executedStep = await this.executeStep(step);
      executedSteps.push(executedStep);

      this.logger.log(
        `Step ${executedStep.stepNumber}/${currentSteps.length}: ${executedStep.status}`,
      );

      // If step failed, stop execution
      if (executedStep.status === 'failed') {
        this.logger.warn(
          `Step ${executedStep.stepNumber} failed, stopping execution`,
        );
        break;
      }

      // Check if we need more steps (dynamic planning)
      if (
        DEFAULT_AGENT_CONFIG.enableDynamicPlanning &&
        i === currentSteps.length - 1
      ) {
        const needsMore = await this.checkIfNeedsMoreSteps(goal, executedSteps);

        if (needsMore.continue && needsMore.newSteps.length > 0) {
          this.logger.log(
            `🔄 Adding ${needsMore.newSteps.length} more steps dynamically`,
          );

          // Convert PlanSteps to AgentSteps
          const newAgentSteps: AgentStep[] = needsMore.newSteps.map((ps) => ({
            ...ps,
            status: 'pending' as AgentStepStatus,
          }));

          currentSteps = [...currentSteps, ...newAgentSteps];

          // Safety check: don't exceed max steps
          if (currentSteps.length > DEFAULT_AGENT_CONFIG.maxSteps) {
            this.logger.warn(
              `Reached max steps limit (${DEFAULT_AGENT_CONFIG.maxSteps})`,
            );
            break;
          }
        }
      }
    }

    return executedSteps;
  }

  /**
   * Execute một step cụ thể
   */
  private async executeStep(step: AgentStep): Promise<AgentStep> {
    const startTime = Date.now();

    try {
      step.status = 'running';

      this.logger.debug(
        `Executing: ${step.action.tool}(${JSON.stringify(step.action.args)})`,
      );

      // Execute tool
      const observation = await this.geminiToolsService.executeTool(
        step.action.tool,
        step.action.args,
      );

      step.observation = observation;
      step.status = 'completed';
      step.executionTime = Date.now() - startTime;

      return step;
    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      step.executionTime = Date.now() - startTime;

      this.logger.error(`Step ${step.stepNumber} failed: ${error.message}`);

      return step;
    }
  }

  /**
   * Kiểm tra xem có cần thêm steps không
   */
  private async checkIfNeedsMoreSteps(
    goal: string,
    executedSteps: AgentStep[],
  ): Promise<{ continue: boolean; newSteps: PlanStep[] }> {
    try {
      const prompt = this.buildContinuationPrompt(goal, executedSteps);

      const response = await this.geminiService.generateResponse(
        prompt,
        this.getContinuationSystemPrompt(),
      );

      // Parse response
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleanResponse);

      if (parsed.continue && Array.isArray(parsed.newSteps)) {
        // Convert to PlanSteps
        const newSteps: PlanStep[] = parsed.newSteps.map(
          (step: any, index: number) => ({
            stepNumber: executedSteps.length + index + 1,
            thought: step.thought,
            action: {
              tool: step.action.tool,
              args: step.action.args || {},
              reason: step.action.reason || '',
            },
          }),
        );

        return { continue: true, newSteps };
      }

      return { continue: false, newSteps: [] };
    } catch (error) {
      this.logger.warn(
        `Failed to check continuation: ${error.message}. Stopping execution.`,
      );
      return { continue: false, newSteps: [] };
    }
  }

  /**
   * Build prompt để check xem có cần steps thêm không
   */
  private buildContinuationPrompt(
    goal: string,
    executedSteps: AgentStep[],
  ): string {
    const stepsLog = executedSteps
      .map(
        (s) =>
          `Step ${s.stepNumber}:\n  Thought: ${s.thought}\n  Action: ${s.action.tool}(${JSON.stringify(s.action.args)})\n  Result: ${JSON.stringify(s.observation)}`,
      )
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

  /**
   * System prompt cho continuation check
   */
  private getContinuationSystemPrompt(): string {
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

  /**
   * Generate final answer từ executed steps
   */
  private async generateFinalAnswer(
    goal: string,
    executedSteps: AgentStep[],
  ): Promise<string> {
    try {
      const prompt = this.buildFinalAnswerPrompt(goal, executedSteps);

      const answer = await this.geminiService.generateResponse(
        prompt,
        this.getFinalAnswerSystemPrompt(),
      );

      return answer.trim();
    } catch (error) {
      this.logger.error(`Failed to generate final answer: ${error.message}`);

      // Fallback: return last observation
      const lastStep = executedSteps[executedSteps.length - 1];
      if (lastStep?.observation) {
        return this.formatObservation(lastStep.observation);
      }

      return 'Xin lỗi, tôi không thể tạo câu trả lời cuối cùng.';
    }
  }

  /**
   * Build prompt cho final answer
   */
  private buildFinalAnswerPrompt(
    goal: string,
    executedSteps: AgentStep[],
  ): string {
    const stepsLog = executedSteps
      .map((s) => {
        const obsPreview =
          typeof s.observation === 'string'
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

  /**
   * System prompt cho final answer generation
   */
  private getFinalAnswerSystemPrompt(): string {
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

  /**
   * Format observation thành string
   */
  private formatObservation(observation: any): string {
    if (typeof observation === 'string') {
      return observation;
    }

    if (observation.message) {
      return observation.message;
    }

    if (observation.data && Array.isArray(observation.data)) {
      const items = observation.data.slice(0, 5);
      return `Tìm thấy ${observation.data.length} kết quả:\n${items.map((item: any, i: number) => `${i + 1}. ${item.name || JSON.stringify(item)}`).join('\n')}`;
    }

    return JSON.stringify(observation, null, 2);
  }
}
