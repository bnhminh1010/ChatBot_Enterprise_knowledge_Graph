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
var ContextManagerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextManagerService = void 0;
const common_1 = require("@nestjs/common");
const redis_conversation_service_1 = require("./redis-conversation.service");
let ContextManagerService = ContextManagerService_1 = class ContextManagerService {
    redisConversation;
    logger = new common_1.Logger(ContextManagerService_1.name);
    constructor(redisConversation) {
        this.redisConversation = redisConversation;
    }
    async getRelevantContext(sessionId, maxMessages = 10) {
        try {
            const messages = await this.redisConversation.getConversationContext(sessionId, maxMessages);
            const entities = this.extractEntitiesFromHistory(messages);
            const topics = this.extractCurrentTopics(messages);
            const mood = this.detectMood(messages);
            const context = {
                sessionId,
                userId: '',
                history: messages,
                currentTopic: topics,
                entities,
                mood,
            };
            this.logger.debug(`Retrieved context for session ${sessionId}: ${topics.length} topics, ${entities.size} entities`);
            return context;
        }
        catch (error) {
            this.logger.error(`Failed to get context: ${error}`);
            return {
                sessionId,
                userId: '',
                history: [],
                currentTopic: [],
                entities: new Map(),
                mood: 'formal',
            };
        }
    }
    async resolveEntityReferences(query, context) {
        const resolvedEntities = new Map();
        const pronounPatterns = [
            { pattern: /\b(họ|người đó|người đấy|anh ấy|chị ấy)\b/i, type: 'person' },
            { pattern: /\b(phòng (đó|này|đấy))\b/i, type: 'department' },
            { pattern: /\b(dự án (đó|này|đấy))\b/i, type: 'project' },
            { pattern: /\b(team (đó|này|đấy))\b/i, type: 'team' },
            { pattern: /\b(nhóm (đó|này|đấy))\b/i, type: 'group' },
        ];
        for (const { pattern, type } of pronounPatterns) {
            if (pattern.test(query)) {
                const recentEntity = this.findRecentEntityByType(context.entities, type);
                if (recentEntity) {
                    resolvedEntities.set(type, {
                        ...recentEntity,
                        confidence: recentEntity.confidence * 0.9,
                    });
                    this.logger.debug(`Resolved "${query.match(pattern)?.[0]}" -> ${recentEntity.value} (${type})`);
                }
            }
        }
        return resolvedEntities;
    }
    extractEntitiesFromHistory(messages) {
        const entities = new Map();
        messages.forEach((msg, index) => {
            if (msg.role === 'user') {
                const extracted = this.extractEntitiesFromMessage(msg.content, index);
                extracted.forEach((entity) => {
                    const key = `${entity.type}:${entity.value}`;
                    if (!entities.has(key) || entities.get(key).sourceMessageIndex < index) {
                        entities.set(key, entity);
                    }
                });
            }
        });
        return entities;
    }
    extractEntitiesFromMessage(content, messageIndex) {
        const entities = [];
        const deptMatch = content.match(/phòng\s+(\w+)/i);
        if (deptMatch) {
            entities.push({
                type: 'department',
                value: deptMatch[1],
                confidence: 0.8,
                sourceMessageIndex: messageIndex,
            });
        }
        const skillMatch = content.match(/kỹ năng\s+(\w+)/i);
        if (skillMatch) {
            entities.push({
                type: 'skill',
                value: skillMatch[1],
                confidence: 0.8,
                sourceMessageIndex: messageIndex,
            });
        }
        const projectMatch = content.match(/dự án\s+(\w+)/i);
        if (projectMatch) {
            entities.push({
                type: 'project',
                value: projectMatch[1],
                confidence: 0.8,
                sourceMessageIndex: messageIndex,
            });
        }
        return entities;
    }
    extractCurrentTopics(messages) {
        const topics = new Set();
        const recentMessages = messages.slice(-3);
        recentMessages.forEach((msg) => {
            const content = msg.content.toLowerCase();
            if (content.includes('nhân viên') || content.includes('employee')) {
                topics.add('employees');
            }
            if (content.includes('phòng ban') || content.includes('department')) {
                topics.add('departments');
            }
            if (content.includes('dự án') || content.includes('project')) {
                topics.add('projects');
            }
            if (content.includes('kỹ năng') || content.includes('skill')) {
                topics.add('skills');
            }
            if (content.includes('phân tích') || content.includes('analysis')) {
                topics.add('analysis');
            }
            if (content.includes('so sánh') || content.includes('compare')) {
                topics.add('comparison');
            }
        });
        return Array.from(topics);
    }
    detectMood(messages) {
        if (messages.length === 0)
            return 'formal';
        const lastMessage = messages[messages.length - 1];
        const content = lastMessage.content.toLowerCase();
        if (content.includes('gấp') || content.includes('urgent') || content.includes('ngay')) {
            return 'urgent';
        }
        if (content.includes('cho tôi') || content.includes('giúp tôi')) {
            return 'casual';
        }
        return 'formal';
    }
    findRecentEntityByType(entities, type) {
        let recent = null;
        let maxIndex = -1;
        entities.forEach((entity) => {
            if (entity.type === type && entity.sourceMessageIndex > maxIndex) {
                recent = entity;
                maxIndex = entity.sourceMessageIndex;
            }
        });
        return recent;
    }
    async updateContext(sessionId, userMessage, assistantResponse, intent) {
        try {
            this.logger.debug(`Context updated for session ${sessionId}`);
        }
        catch (error) {
            this.logger.error(`Failed to update context: ${error}`);
        }
    }
};
exports.ContextManagerService = ContextManagerService;
exports.ContextManagerService = ContextManagerService = ContextManagerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_conversation_service_1.RedisConversationService])
], ContextManagerService);
//# sourceMappingURL=context-manager.service.js.map