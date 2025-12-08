/**
 * @fileoverview Agent Memory Service - Execution History & Learning
 * @module ai/agent/agent-memory.service
 *
 * Service quản lý agent execution history và learning.
 * Sử dụng Redis để lưu trữ executions, feedback và statistics.
 *
 * Tính năng:
 * - Lưu trữ execution history
 * - Tìm kiếm executions tương tự
 * - Thu thập user feedback
 * - Thống kê performance
 *
 * @see AgentExecutorService - Tạo executions
 * @author APTX3107 Team
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AgentExecution, AgentFeedback } from './types/agent.types';

/**
 * Service quản lý memory và history cho agent.
 * Lưu trữ executions trong Redis với TTL 7 ngày.
 *
 * @example
 * await agentMemoryService.saveExecution(execution);
 * const relevant = await agentMemoryService.getRelevantHistory(query);
 */
@Injectable()
export class AgentMemoryService {
  private readonly logger = new Logger(AgentMemoryService.name);

  /** Prefix cho execution keys trong Redis */
  private readonly EXECUTION_KEY_PREFIX = 'agent:execution:';

  /** Key cho sorted set chứa danh sách executions */
  private readonly EXECUTION_LIST_KEY = 'agent:executions:list';

  /** Prefix cho feedback keys */
  private readonly FEEDBACK_KEY_PREFIX = 'agent:feedback:';

  /** TTL cho các records: 7 ngày */
  private readonly TTL_SECONDS = 7 * 24 * 60 * 60;

  /**
   * @param redis - Redis client được inject
   */
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  /**
   * Lưu agent execution vào Redis.
   * Tự động cleanup nếu vượt quá 1000 executions.
   *
   * @param execution - Execution cần lưu
   */
  async saveExecution(execution: AgentExecution): Promise<void> {
    try {
      const key = `${this.EXECUTION_KEY_PREFIX}${execution.id}`;

      // Save execution data
      await this.redis.setex(key, this.TTL_SECONDS, JSON.stringify(execution));

      // Add to execution list (sorted by timestamp)
      await this.redis.zadd(
        this.EXECUTION_LIST_KEY,
        execution.timestamp.getTime(),
        execution.id,
      );

      // Keep only last 1000 executions
      await this.redis.zremrangebyrank(this.EXECUTION_LIST_KEY, 0, -1001);

      this.logger.debug(`Saved execution ${execution.id} to Redis`);
    } catch (error) {
      this.logger.error(`Failed to save execution: ${error.message}`);
      // Don't throw - memory save failure shouldn't break agent
    }
  }

  /**
   * Lấy execution theo ID.
   *
   * @param executionId - ID của execution
   * @returns Execution hoặc null nếu không tìm thấy
   */
  async getExecution(executionId: string): Promise<AgentExecution | null> {
    try {
      const key = `${this.EXECUTION_KEY_PREFIX}${executionId}`;
      const data = await this.redis.get(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Failed to get execution: ${error.message}`);
      return null;
    }
  }

  /**
   * Lấy danh sách executions gần đây.
   * Sắp xếp theo thời gian mới nhất trước.
   *
   * @param limit - Số lượng executions tối đa
   * @returns Danh sách executions
   */
  async getRecentExecutions(limit = 10): Promise<AgentExecution[]> {
    try {
      const executionIds = await this.redis.zrevrange(
        this.EXECUTION_LIST_KEY,
        0,
        limit - 1,
      );

      if (executionIds.length === 0) {
        return [];
      }

      const executions: AgentExecution[] = [];
      for (const id of executionIds) {
        const execution = await this.getExecution(id);
        if (execution) {
          executions.push(execution);
        }
      }

      return executions;
    } catch (error) {
      this.logger.error(`Failed to get recent executions: ${error.message}`);
      return [];
    }
  }

  /**
   * Tìm executions tương tự dựa trên query.
   * Hiện tại sử dụng keyword matching, TODO: semantic search với ChromaDB.
   *
   * @param query - Query cần tìm executions tương tự
   * @param limit - Số lượng kết quả tối đa
   * @returns Danh sách executions liên quan
   */
  async getRelevantHistory(
    query: string,
    limit = 5,
  ): Promise<AgentExecution[]> {
    this.logger.debug(`Getting relevant history for query: "${query}"`);

    try {
      const recent = await this.getRecentExecutions(limit * 2);

      // Simple keyword matching
      const lowerQuery = query.toLowerCase();
      const relevant = recent
        .filter(
          (exec) =>
            exec.query.toLowerCase().includes(lowerQuery) ||
            exec.plan.goal.toLowerCase().includes(lowerQuery),
        )
        .slice(0, limit);

      if (relevant.length > 0) {
        this.logger.debug(`Found ${relevant.length} relevant executions`);
        return relevant;
      }

      return recent.slice(0, limit);
    } catch (error) {
      this.logger.error(`Failed to get relevant history: ${error.message}`);
      return [];
    }
  }

  /**
   * Lưu user feedback cho một execution.
   *
   * @param feedback - Feedback từ user (rating, comments)
   */
  async saveFeedback(feedback: AgentFeedback): Promise<void> {
    try {
      const key = `${this.FEEDBACK_KEY_PREFIX}${feedback.executionId}`;

      await this.redis.setex(key, this.TTL_SECONDS, JSON.stringify(feedback));

      this.logger.debug(
        `Saved feedback for execution ${feedback.executionId}: ${feedback.rating}/5`,
      );
    } catch (error) {
      this.logger.error(`Failed to save feedback: ${error.message}`);
    }
  }

  /**
   * Lấy feedback cho một execution.
   *
   * @param executionId - ID của execution
   * @returns Feedback hoặc null nếu không có
   */
  async getFeedback(executionId: string): Promise<AgentFeedback | null> {
    try {
      const key = `${this.FEEDBACK_KEY_PREFIX}${executionId}`;
      const data = await this.redis.get(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Failed to get feedback: ${error.message}`);
      return null;
    }
  }

  /**
   * Lấy thống kê execution.
   * Bao gồm total, average steps, average time, success rate.
   *
   * @returns Object chứa các metrics
   */
  async getStatistics(): Promise<{
    totalExecutions: number;
    avgSteps: number;
    avgExecutionTime: number;
    successRate: number;
  }> {
    try {
      const recent = await this.getRecentExecutions(100);

      if (recent.length === 0) {
        return {
          totalExecutions: 0,
          avgSteps: 0,
          avgExecutionTime: 0,
          successRate: 0,
        };
      }

      const totalSteps = recent.reduce(
        (sum, exec) => sum + exec.result.totalSteps,
        0,
      );
      const totalTime = recent.reduce(
        (sum, exec) => sum + exec.result.executionTime,
        0,
      );
      const successCount = recent.filter((exec) => exec.result.success).length;

      return {
        totalExecutions: recent.length,
        avgSteps: totalSteps / recent.length,
        avgExecutionTime: totalTime / recent.length,
        successRate: (successCount / recent.length) * 100,
      };
    } catch (error) {
      this.logger.error(`Failed to get statistics: ${error.message}`);
      return {
        totalExecutions: 0,
        avgSteps: 0,
        avgExecutionTime: 0,
        successRate: 0,
      };
    }
  }

  /**
   * Xóa toàn bộ agent memory.
   * Chỉ sử dụng cho testing/debugging.
   */
  async clearMemory(): Promise<void> {
    try {
      const executionIds = await this.redis.zrange(
        this.EXECUTION_LIST_KEY,
        0,
        -1,
      );

      for (const id of executionIds) {
        await this.redis.del(`${this.EXECUTION_KEY_PREFIX}${id}`);
        await this.redis.del(`${this.FEEDBACK_KEY_PREFIX}${id}`);
      }

      await this.redis.del(this.EXECUTION_LIST_KEY);

      this.logger.log('Cleared all agent memory');
    } catch (error) {
      this.logger.error(`Failed to clear memory: ${error.message}`);
    }
  }
}
