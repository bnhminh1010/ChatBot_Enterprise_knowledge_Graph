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
var ChatController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const chat_service_1 = require("./chat.service");
const metrics_service_1 = require("./services/metrics.service");
const chat_query_dto_1 = require("./dto/chat-query.dto");
const neo4j_service_1 = require("../core/neo4j/neo4j.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let ChatController = ChatController_1 = class ChatController {
    chatService;
    metricsService;
    neo4jService;
    logger = new common_1.Logger(ChatController_1.name);
    constructor(chatService, metricsService, neo4jService) {
        this.chatService = chatService;
        this.metricsService = metricsService;
        this.neo4jService = neo4jService;
    }
    async processQuery(dto, user) {
        try {
            const result = await this.chatService.processQuery(dto.message, dto.conversationId, user.username);
            return {
                message: dto.message,
                response: result.response,
                queryType: result.queryType,
                queryLevel: result.queryLevel,
                processingTime: result.processingTime,
                conversationId: result.conversationId,
                timestamp: new Date(),
            };
        }
        catch (error) {
            this.logger.error(`Error processing chat query: ${error}`);
            throw error;
        }
    }
    async indexEntities() {
        try {
            await this.chatService.indexEntitiesToChromaDB();
            return { message: 'Entities indexed successfully to ChromaDB' };
        }
        catch (error) {
            this.logger.error(`Error indexing entities: ${error}`);
            throw error;
        }
    }
    async health() {
        let neo4jStatus;
        try {
            neo4jStatus = await this.neo4jService.verifyConnection();
        }
        catch (error) {
            neo4jStatus = `Error: ${error instanceof Error ? error.message : 'Unknown'}`;
        }
        const envStatus = {
            NEO4J_URI: !!process.env.NEO4J_URI,
            NEO4J_USER: !!process.env.NEO4J_USER,
            NEO4J_PASSWORD: !!process.env.NEO4J_PASSWORD,
            GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
        };
        const services = {
            neo4j: neo4jStatus,
            env: envStatus,
        };
        const allHealthy = neo4jStatus === true &&
            Object.values(envStatus).every((x) => x === true);
        return {
            status: allHealthy ? 'ok' : 'degraded',
            services,
            timestamp: new Date(),
        };
    }
    getMetrics() {
        return this.metricsService.getStats();
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'VIEWER'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [chat_query_dto_1.ChatQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "processQuery", null);
__decorate([
    (0, common_1.Post)('index'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "indexEntities", null);
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "health", null);
__decorate([
    (0, common_1.Get)('metrics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "getMetrics", null);
exports.ChatController = ChatController = ChatController_1 = __decorate([
    (0, common_1.Controller)('chat'),
    __metadata("design:paramtypes", [chat_service_1.ChatService,
        metrics_service_1.MetricsService,
        neo4j_service_1.Neo4jService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map