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
const chat_query_dto_1 = require("./dto/chat-query.dto");
let ChatController = ChatController_1 = class ChatController {
    chatService;
    logger = new common_1.Logger(ChatController_1.name);
    constructor(chatService) {
        this.chatService = chatService;
    }
    async processQuery(dto) {
        try {
            const result = await this.chatService.processQuery(dto.message);
            return {
                message: dto.message,
                response: result.response,
                queryType: result.queryType,
                queryLevel: result.queryLevel,
                processingTime: result.processingTime,
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
        return {
            status: 'ok',
            services: {
                neo4j: true,
                gemini: true,
            },
        };
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [chat_query_dto_1.ChatQueryDto]),
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
exports.ChatController = ChatController = ChatController_1 = __decorate([
    (0, common_1.Controller)('chat'),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map