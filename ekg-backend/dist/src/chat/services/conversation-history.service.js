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
var ConversationHistoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationHistoryService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../../core/neo4j/neo4j.service");
const uuid_1 = require("uuid");
let ConversationHistoryService = ConversationHistoryService_1 = class ConversationHistoryService {
    neo4jService;
    logger = new common_1.Logger(ConversationHistoryService_1.name);
    MAX_CONTEXT_MESSAGES = 10;
    MAX_CONTEXT_LENGTH = 4000;
    constructor(neo4jService) {
        this.neo4jService = neo4jService;
    }
    async createConversation(userId, title) {
        const conversationId = `CONV_${(0, uuid_1.v4)()}`;
        const now = new Date();
        const cypher = `
      MATCH (u:NguoiDung {username: $userId})
      CREATE (c:Conversation {
        id: $conversationId,
        title: $title,
        createdAt: datetime($createdAt),
        updatedAt: datetime($updatedAt)
      })
      CREATE (u)-[:HAS_CONVERSATION]->(c)
      RETURN c
    `;
        const params = {
            userId,
            conversationId,
            title: title || `Chat ${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN')}`,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        };
        try {
            const result = await this.neo4jService.runRaw(cypher, params);
            if (result.records.length === 0) {
                throw new common_1.NotFoundException(`User ${userId} not found`);
            }
            const node = result.records[0].get('c');
            return this.mapNodeToConversation(node);
        }
        catch (error) {
            this.logger.error(`Failed to create conversation: ${error}`);
            throw error;
        }
    }
    async addMessage(conversationId, role, content, metadata) {
        const messageId = `MSG_${(0, uuid_1.v4)()}`;
        const now = new Date();
        const cypher = `
      MATCH (c:Conversation {id: $conversationId})
      CREATE (m:Message {
        id: $messageId,
        role: $role,
        content: $content,
        queryType: $queryType,
        queryLevel: $queryLevel,
        processingTime: $processingTime,
        timestamp: datetime($timestamp)
      })
      CREATE (c)-[:HAS_MESSAGE]->(m)
      SET c.updatedAt = datetime($timestamp)
      RETURN m
    `;
        const params = {
            conversationId,
            messageId,
            role,
            content,
            queryType: metadata?.queryType,
            queryLevel: metadata?.queryLevel,
            processingTime: metadata?.processingTime,
            timestamp: now.toISOString(),
        };
        try {
            const result = await this.neo4jService.runRaw(cypher, params);
            if (result.records.length === 0) {
                throw new common_1.NotFoundException(`Conversation ${conversationId} not found`);
            }
            const node = result.records[0].get('m');
            return this.mapNodeToMessage(node, conversationId);
        }
        catch (error) {
            this.logger.error(`Failed to add message: ${error}`);
            throw error;
        }
    }
    async getConversationHistory(conversationId, limit = 50) {
        const cypher = `
      MATCH (c:Conversation {id: $conversationId})
      OPTIONAL MATCH (c)-[:HAS_MESSAGE]->(m:Message)
      WITH c, m
      ORDER BY m.timestamp DESC
      LIMIT $limit
      RETURN c, collect(m) as messages
    `;
        const params = { conversationId, limit };
        try {
            const result = await this.neo4jService.runRaw(cypher, params);
            if (result.records.length === 0) {
                throw new common_1.NotFoundException(`Conversation ${conversationId} not found`);
            }
            const record = result.records[0];
            const conversationNode = record.get('c');
            const messageNodes = record.get('messages');
            const conversation = this.mapNodeToConversation(conversationNode);
            const messages = messageNodes
                .filter((node) => node !== null)
                .map((node) => this.mapNodeToMessage(node, conversationId))
                .reverse();
            return { conversation, messages };
        }
        catch (error) {
            this.logger.error(`Failed to get conversation history: ${error}`);
            throw error;
        }
    }
    async getConversationContext(conversationId) {
        try {
            const history = await this.getConversationHistory(conversationId, this.MAX_CONTEXT_MESSAGES);
            const recentMessages = history.messages
                .filter(m => m.role === 'user' || m.role === 'assistant')
                .slice(-this.MAX_CONTEXT_MESSAGES)
                .map(m => ({
                role: m.role,
                content: m.content,
            }));
            let totalLength = recentMessages.reduce((sum, msg) => sum + msg.content.length, 0);
            if (totalLength > this.MAX_CONTEXT_LENGTH) {
                while (totalLength > this.MAX_CONTEXT_LENGTH && recentMessages.length > 2) {
                    const removed = recentMessages.shift();
                    if (removed) {
                        totalLength -= removed.content.length;
                    }
                }
            }
            return {
                conversationId,
                recentMessages,
            };
        }
        catch (error) {
            this.logger.error(`Failed to get conversation context: ${error}`);
            return {
                conversationId,
                recentMessages: [],
            };
        }
    }
    async getUserConversations(userId, limit = 20) {
        const cypher = `
      MATCH (u:NguoiDung {username: $userId})-[:HAS_CONVERSATION]->(c:Conversation)
      OPTIONAL MATCH (c)-[:HAS_MESSAGE]->(m:Message)
      WITH c, count(m) as messageCount
      ORDER BY c.updatedAt DESC
      LIMIT $limit
      RETURN c, messageCount
    `;
        const params = { userId, limit };
        try {
            const result = await this.neo4jService.runRaw(cypher, params);
            return result.records.map(record => {
                const conversation = this.mapNodeToConversation(record.get('c'));
                conversation.messageCount = record.get('messageCount')?.toNumber() || 0;
                return conversation;
            });
        }
        catch (error) {
            this.logger.error(`Failed to get user conversations: ${error}`);
            throw error;
        }
    }
    async deleteConversation(conversationId) {
        const cypher = `
      MATCH (c:Conversation {id: $conversationId})
      OPTIONAL MATCH (c)-[:HAS_MESSAGE]->(m:Message)
      DETACH DELETE c, m
      RETURN count(c) as deleted
    `;
        try {
            const result = await this.neo4jService.runRaw(cypher, { conversationId });
            const deleted = result.records[0]?.get('deleted')?.toNumber() || 0;
            return deleted > 0;
        }
        catch (error) {
            this.logger.error(`Failed to delete conversation: ${error}`);
            throw error;
        }
    }
    mapNodeToConversation(node) {
        const props = node.properties;
        return {
            id: props.id,
            userId: '',
            title: props.title,
            createdAt: new Date(props.createdAt),
            updatedAt: new Date(props.updatedAt),
        };
    }
    mapNodeToMessage(node, conversationId) {
        const props = node.properties;
        return {
            id: props.id,
            conversationId,
            role: props.role,
            content: props.content,
            queryType: props.queryType,
            queryLevel: props.queryLevel,
            processingTime: props.processingTime?.toNumber(),
            timestamp: new Date(props.timestamp),
        };
    }
};
exports.ConversationHistoryService = ConversationHistoryService;
exports.ConversationHistoryService = ConversationHistoryService = ConversationHistoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], ConversationHistoryService);
//# sourceMappingURL=conversation-history.service.js.map