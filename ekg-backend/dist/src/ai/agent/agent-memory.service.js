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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AgentMemoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentMemoryService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
let AgentMemoryService = AgentMemoryService_1 = class AgentMemoryService {
    redis;
    logger = new common_1.Logger(AgentMemoryService_1.name);
    EXECUTION_KEY_PREFIX = 'agent:execution:';
    EXECUTION_LIST_KEY = 'agent:executions:list';
    FEEDBACK_KEY_PREFIX = 'agent:feedback:';
    TTL_SECONDS = 7 * 24 * 60 * 60;
    constructor(redis) {
        this.redis = redis;
    }
    async saveExecution(execution) {
        try {
            const key = `${this.EXECUTION_KEY_PREFIX}${execution.id}`;
            await this.redis.setex(key, this.TTL_SECONDS, JSON.stringify(execution));
            await this.redis.zadd(this.EXECUTION_LIST_KEY, execution.timestamp.getTime(), execution.id);
            await this.redis.zremrangebyrank(this.EXECUTION_LIST_KEY, 0, -1001);
            this.logger.debug(`Saved execution ${execution.id} to Redis`);
        }
        catch (error) {
            this.logger.error(`Failed to save execution: ${error.message}`);
        }
    }
    async getExecution(executionId) {
        try {
            const key = `${this.EXECUTION_KEY_PREFIX}${executionId}`;
            const data = await this.redis.get(key);
            if (!data) {
                return null;
            }
            return JSON.parse(data);
        }
        catch (error) {
            this.logger.error(`Failed to get execution: ${error.message}`);
            return null;
        }
    }
    async getRecentExecutions(limit = 10) {
        try {
            const executionIds = await this.redis.zrevrange(this.EXECUTION_LIST_KEY, 0, limit - 1);
            if (executionIds.length === 0) {
                return [];
            }
            const executions = [];
            for (const id of executionIds) {
                const execution = await this.getExecution(id);
                if (execution) {
                    executions.push(execution);
                }
            }
            return executions;
        }
        catch (error) {
            this.logger.error(`Failed to get recent executions: ${error.message}`);
            return [];
        }
    }
    async getRelevantHistory(query, limit = 5) {
        this.logger.debug(`Getting relevant history for query: "${query}"`);
        try {
            const recent = await this.getRecentExecutions(limit * 2);
            const lowerQuery = query.toLowerCase();
            const relevant = recent
                .filter((exec) => exec.query.toLowerCase().includes(lowerQuery) ||
                exec.plan.goal.toLowerCase().includes(lowerQuery))
                .slice(0, limit);
            if (relevant.length > 0) {
                this.logger.debug(`Found ${relevant.length} relevant executions`);
                return relevant;
            }
            return recent.slice(0, limit);
        }
        catch (error) {
            this.logger.error(`Failed to get relevant history: ${error.message}`);
            return [];
        }
    }
    async saveFeedback(feedback) {
        try {
            const key = `${this.FEEDBACK_KEY_PREFIX}${feedback.executionId}`;
            await this.redis.setex(key, this.TTL_SECONDS, JSON.stringify(feedback));
            this.logger.debug(`Saved feedback for execution ${feedback.executionId}: ${feedback.rating}/5`);
        }
        catch (error) {
            this.logger.error(`Failed to save feedback: ${error.message}`);
        }
    }
    async getFeedback(executionId) {
        try {
            const key = `${this.FEEDBACK_KEY_PREFIX}${executionId}`;
            const data = await this.redis.get(key);
            if (!data) {
                return null;
            }
            return JSON.parse(data);
        }
        catch (error) {
            this.logger.error(`Failed to get feedback: ${error.message}`);
            return null;
        }
    }
    async getStatistics() {
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
            const totalSteps = recent.reduce((sum, exec) => sum + exec.result.totalSteps, 0);
            const totalTime = recent.reduce((sum, exec) => sum + exec.result.executionTime, 0);
            const successCount = recent.filter((exec) => exec.result.success).length;
            return {
                totalExecutions: recent.length,
                avgSteps: totalSteps / recent.length,
                avgExecutionTime: totalTime / recent.length,
                successRate: (successCount / recent.length) * 100,
            };
        }
        catch (error) {
            this.logger.error(`Failed to get statistics: ${error.message}`);
            return {
                totalExecutions: 0,
                avgSteps: 0,
                avgExecutionTime: 0,
                successRate: 0,
            };
        }
    }
    async clearMemory() {
        try {
            const executionIds = await this.redis.zrange(this.EXECUTION_LIST_KEY, 0, -1);
            for (const id of executionIds) {
                await this.redis.del(`${this.EXECUTION_KEY_PREFIX}${id}`);
                await this.redis.del(`${this.FEEDBACK_KEY_PREFIX}${id}`);
            }
            await this.redis.del(this.EXECUTION_LIST_KEY);
            this.logger.log('Cleared all agent memory');
        }
        catch (error) {
            this.logger.error(`Failed to clear memory: ${error.message}`);
        }
    }
};
exports.AgentMemoryService = AgentMemoryService;
exports.AgentMemoryService = AgentMemoryService = AgentMemoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('REDIS_CLIENT')),
    __metadata("design:paramtypes", [ioredis_1.Redis])
], AgentMemoryService);
//# sourceMappingURL=agent-memory.service.js.map