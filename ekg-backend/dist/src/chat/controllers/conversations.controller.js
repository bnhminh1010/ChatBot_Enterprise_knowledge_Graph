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
var ConversationsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationsController = void 0;
const common_1 = require("@nestjs/common");
const redis_conversation_service_1 = require("../services/redis-conversation.service");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../../auth/decorators/current-user.decorator");
let ConversationsController = ConversationsController_1 = class ConversationsController {
    redisConversation;
    logger = new common_1.Logger(ConversationsController_1.name);
    constructor(redisConversation) {
        this.redisConversation = redisConversation;
    }
    async getUserConversations(user) {
        try {
            const conversations = await this.redisConversation.getUserConversations(user.username, 20);
            const conversationsWithTitle = conversations.map((conv) => {
                const firstUserMessage = conv.messages.find((m) => m.role === 'user');
                return {
                    ...conv,
                    title: firstUserMessage
                        ? firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
                        : 'New Chat',
                };
            });
            this.logger.log(`Retrieved ${conversationsWithTitle.length} conversations for user ${user.username}`);
            return conversationsWithTitle;
        }
        catch (error) {
            this.logger.error(`Error getting user conversations: ${error}`);
            throw new common_1.HttpException('Failed to retrieve conversations', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getConversation(conversationId, user) {
        try {
            const conversation = await this.redisConversation.getConversation(conversationId);
            if (!conversation) {
                throw new common_1.HttpException('Conversation not found', common_1.HttpStatus.NOT_FOUND);
            }
            if (conversation.userId !== user.username) {
                throw new common_1.HttpException('Unauthorized access to conversation', common_1.HttpStatus.FORBIDDEN);
            }
            this.logger.log(`Retrieved conversation ${conversationId} for user ${user.username}`);
            return conversation;
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            this.logger.error(`Error getting conversation ${conversationId}: ${error}`);
            throw new common_1.HttpException('Failed to retrieve conversation', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async deleteConversation(conversationId, user) {
        try {
            const conversation = await this.redisConversation.getConversation(conversationId);
            if (!conversation) {
                throw new common_1.HttpException('Conversation not found', common_1.HttpStatus.NOT_FOUND);
            }
            if (conversation.userId !== user.username) {
                throw new common_1.HttpException('Unauthorized to delete this conversation', common_1.HttpStatus.FORBIDDEN);
            }
            await this.redisConversation.deleteConversation(conversationId);
            this.logger.log(`Deleted conversation ${conversationId} for user ${user.username}`);
            return {
                message: `Conversation ${conversationId} deleted successfully`,
            };
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            this.logger.error(`Error deleting conversation ${conversationId}: ${error}`);
            throw new common_1.HttpException('Failed to delete conversation', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.ConversationsController = ConversationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "getUserConversations", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "getConversation", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "deleteConversation", null);
exports.ConversationsController = ConversationsController = ConversationsController_1 = __decorate([
    (0, common_1.Controller)('chat/conversations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'VIEWER'),
    __metadata("design:paramtypes", [redis_conversation_service_1.RedisConversationService])
], ConversationsController);
//# sourceMappingURL=conversations.controller.js.map