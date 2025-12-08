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
var ContextCompressionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextCompressionService = void 0;
const common_1 = require("@nestjs/common");
const gemini_service_1 = require("../../ai/gemini.service");
let ContextCompressionService = ContextCompressionService_1 = class ContextCompressionService {
    geminiService;
    logger = new common_1.Logger(ContextCompressionService_1.name);
    RECENT_MESSAGES_COUNT = 6;
    MAX_CONTEXT_TOKENS = 4000;
    SUMMARY_TRIGGER_COUNT = 10;
    constructor(geminiService) {
        this.geminiService = geminiService;
    }
    async compressContext(messages, options) {
        const maxTokens = options?.maxTokens || this.MAX_CONTEXT_TOKENS;
        if (messages.length <= this.RECENT_MESSAGES_COUNT) {
            return {
                summary: '',
                recentMessages: messages,
                keyEntities: this.extractEntities(messages),
                tokenEstimate: this.estimateTokens(messages),
            };
        }
        const olderMessages = messages.slice(0, -this.RECENT_MESSAGES_COUNT);
        const recentMessages = messages.slice(-this.RECENT_MESSAGES_COUNT);
        let summary = '';
        if (olderMessages.length >=
            this.SUMMARY_TRIGGER_COUNT - this.RECENT_MESSAGES_COUNT) {
            summary = await this.summarizeMessages(olderMessages);
        }
        else {
            summary = this.quickSummarize(olderMessages);
        }
        const keyEntities = this.extractEntities(messages);
        const tokenEstimate = this.estimateTokens(recentMessages) +
            this.estimateStringTokens(summary) +
            keyEntities.length * 10;
        this.logger.debug(`Compressed ${messages.length} messages: ` +
            `summary=${summary.length} chars, ` +
            `recent=${recentMessages.length}, ` +
            `entities=${keyEntities.length}, ` +
            `tokens≈${tokenEstimate}`);
        return {
            summary,
            recentMessages,
            keyEntities,
            tokenEstimate,
        };
    }
    async summarizeMessages(messages) {
        try {
            const conversationText = messages
                .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
                .join('\n');
            const prompt = `Tóm tắt cuộc hội thoại sau thành 2-3 câu ngắn gọn. 
Giữ lại thông tin quan trọng như: tên người, phòng ban, dự án, kỹ năng được đề cập.

Cuộc hội thoại:
${conversationText}

Tóm tắt:`;
            const summary = await this.geminiService.generateResponse(prompt, 'Bạn là một AI assistant chuyên tóm tắt hội thoại. Trả lời ngắn gọn, súc tích bằng tiếng Việt.');
            return summary.trim();
        }
        catch (error) {
            this.logger.warn(`Summarization failed: ${error.message}, using fallback`);
            return this.quickSummarize(messages);
        }
    }
    quickSummarize(messages) {
        if (messages.length === 0)
            return '';
        const userQueries = messages
            .filter((m) => m.role === 'user')
            .map((m) => m.content.substring(0, 100))
            .slice(-3);
        if (userQueries.length === 0)
            return '';
        return `Trước đó user đã hỏi về: ${userQueries.join('; ')}`;
    }
    extractEntities(messages) {
        const entityMap = new Map();
        const patterns = {
            person: /(?:nhân viên|người|anh|chị|em)\s+([A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+(?:\s+[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+)*)/gi,
            department: /(?:phòng|department|team|bộ phận)\s+([A-Za-z]+)/gi,
            project: /(?:dự án|project)\s+([A-Za-z0-9]+)/gi,
            skill: /(?:biết|skill|kỹ năng)\s+([A-Za-z0-9#.+]+)/gi,
        };
        messages.forEach((msg) => {
            const content = msg.content;
            const timestamp = msg.timestamp;
            for (const [type, pattern] of Object.entries(patterns)) {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const value = match[1].toLowerCase().trim();
                    const key = `${type}:${value}`;
                    if (entityMap.has(key)) {
                        const entity = entityMap.get(key);
                        entity.mentions++;
                        entity.lastMentioned = timestamp;
                    }
                    else {
                        entityMap.set(key, {
                            type: type,
                            value,
                            mentions: 1,
                            lastMentioned: timestamp,
                        });
                    }
                }
            }
        });
        return Array.from(entityMap.values())
            .sort((a, b) => b.mentions - a.mentions)
            .slice(0, 10);
    }
    estimateTokens(messages) {
        const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
        return Math.ceil(totalChars * 0.75);
    }
    estimateStringTokens(text) {
        return Math.ceil(text.length * 0.75);
    }
    buildContextPrompt(compressed) {
        const parts = [];
        if (compressed.summary) {
            parts.push(`📋 Tóm tắt cuộc hội thoại trước: ${compressed.summary}`);
        }
        if (compressed.keyEntities.length > 0) {
            const entityList = compressed.keyEntities
                .map((e) => `${e.type}: ${e.value}`)
                .join(', ');
            parts.push(`🔑 Các thực thể đã đề cập: ${entityList}`);
        }
        if (compressed.recentMessages.length > 0) {
            parts.push('📝 Cuộc hội thoại gần đây:');
            compressed.recentMessages.forEach((m) => {
                const role = m.role === 'user' ? 'User' : 'Assistant';
                parts.push(`${role}: ${m.content}`);
            });
        }
        return parts.join('\n\n');
    }
};
exports.ContextCompressionService = ContextCompressionService;
exports.ContextCompressionService = ContextCompressionService = ContextCompressionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [gemini_service_1.GeminiService])
], ContextCompressionService);
//# sourceMappingURL=context-compression.service.js.map