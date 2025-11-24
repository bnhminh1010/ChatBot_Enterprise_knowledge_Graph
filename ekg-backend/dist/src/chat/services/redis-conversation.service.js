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
var RedisConversationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisConversationService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
let RedisConversationService = RedisConversationService_1 = class RedisConversationService {
    logger = new common_1.Logger(RedisConversationService_1.name);
    redis;
    MAX_MESSAGES = 50;
    TTL_SECONDS = 7 * 24 * 60 * 60;
    constructor() {
        this.redis = new ioredis_1.Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });
        this.redis.on('error', (err) => {
            this.logger.error(`Redis connection error: ${err}`);
        });
        this.redis.on('connect', () => {
            this.logger.log('Redis connected successfully');
        });
    }
    async getOrCreateConversation(userId, conversationId) {
        if (conversationId) {
            const exists = await this.redis.exists(`conversation:${conversationId}`);
            if (exists) {
                return conversationId;
            }
        }
        const newId = `CONV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const conversation = {
            id: newId,
            userId,
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        await this.redis.setex(`conversation:${newId}`, this.TTL_SECONDS, JSON.stringify(conversation));
        await this.redis.sadd(`user:${userId}:conversations`, newId);
        this.logger.debug(`Created conversation ${newId} for user ${userId}`);
        return newId;
    }
    async addMessage(conversationId, role, content, metadata) {
        try {
            const key = `conversation:${conversationId}`;
            const data = await this.redis.get(key);
            if (!data) {
                this.logger.warn(`Conversation ${conversationId} not found`);
                return;
            }
            const conversation = JSON.parse(data);
            const message = {
                role,
                content,
                timestamp: Date.now(),
                metadata,
            };
            conversation.messages.push(message);
            conversation.updatedAt = Date.now();
            if (conversation.messages.length > this.MAX_MESSAGES) {
                conversation.messages = conversation.messages.slice(-this.MAX_MESSAGES);
            }
            await this.redis.setex(key, this.TTL_SECONDS, JSON.stringify(conversation));
            this.logger.debug(`Added ${role} message to conversation ${conversationId}`);
        }
        catch (error) {
            this.logger.error(`Failed to add message: ${error}`);
        }
    }
    async getConversationContext(conversationId, maxMessages = 10) {
        try {
            const data = await this.redis.get(`conversation:${conversationId}`);
            if (!data) {
                return [];
            }
            const conversation = JSON.parse(data);
            return conversation.messages.slice(-maxMessages);
        }
        catch (error) {
            this.logger.error(`Failed to get conversation context: ${error}`);
            return [];
        }
    }
    async getConversation(conversationId) {
        try {
            const data = await this.redis.get(`conversation:${conversationId}`);
            return data ? JSON.parse(data) : null;
        }
        catch (error) {
            this.logger.error(`Failed to get conversation: ${error}`);
            return null;
        }
    }
    async getUserConversations(userId, limit = 20) {
        try {
            const conversationIds = await this.redis.smembers(`user:${userId}:conversations`);
            const conversations = [];
            for (const id of conversationIds.slice(0, limit)) {
                const conv = await this.getConversation(id);
                if (conv) {
                    conversations.push(conv);
                }
            }
            return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
        }
        catch (error) {
            this.logger.error(`Failed to get user conversations: ${error}`);
            return [];
        }
    }
    async deleteConversation(conversationId) {
        try {
            const conv = await this.getConversation(conversationId);
            if (conv) {
                await this.redis.del(`conversation:${conversationId}`);
                await this.redis.srem(`user:${conv.userId}:conversations`, conversationId);
                this.logger.log(`Deleted conversation ${conversationId}`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to delete conversation: ${error}`);
        }
    }
    async isHealthy() {
        try {
            await this.redis.ping();
            return true;
        }
        catch {
            return false;
        }
    }
    async onModuleDestroy() {
        await this.redis.quit();
    }
};
exports.RedisConversationService = RedisConversationService;
exports.RedisConversationService = RedisConversationService = RedisConversationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RedisConversationService);
//# sourceMappingURL=redis-conversation.service.js.map