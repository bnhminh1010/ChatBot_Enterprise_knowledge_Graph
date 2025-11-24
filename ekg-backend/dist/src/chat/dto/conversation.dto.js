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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetConversationHistoryDto = exports.AddMessageDto = exports.CreateConversationDto = void 0;
const class_validator_1 = require("class-validator");
class CreateConversationDto {
    userId;
    title;
}
exports.CreateConversationDto = CreateConversationDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateConversationDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateConversationDto.prototype, "title", void 0);
class AddMessageDto {
    conversationId;
    role;
    content;
    queryType;
    queryLevel;
    processingTime;
}
exports.AddMessageDto = AddMessageDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddMessageDto.prototype, "conversationId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['user', 'assistant', 'system']),
    __metadata("design:type", String)
], AddMessageDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddMessageDto.prototype, "content", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddMessageDto.prototype, "queryType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddMessageDto.prototype, "queryLevel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], AddMessageDto.prototype, "processingTime", void 0);
class GetConversationHistoryDto {
    conversationId;
    limit;
}
exports.GetConversationHistoryDto = GetConversationHistoryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetConversationHistoryDto.prototype, "conversationId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], GetConversationHistoryDto.prototype, "limit", void 0);
//# sourceMappingURL=conversation.dto.js.map