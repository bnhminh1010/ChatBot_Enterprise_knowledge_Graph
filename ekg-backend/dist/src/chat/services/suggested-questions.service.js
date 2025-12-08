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
var SuggestedQuestionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggestedQuestionsService = void 0;
const common_1 = require("@nestjs/common");
const gemini_service_1 = require("../../ai/gemini.service");
let SuggestedQuestionsService = SuggestedQuestionsService_1 = class SuggestedQuestionsService {
    geminiService;
    logger = new common_1.Logger(SuggestedQuestionsService_1.name);
    templates = {
        employee: [
            'Thông tin chi tiết về {entity}?',
            '{entity} có những kỹ năng gì?',
            '{entity} đang làm dự án nào?',
            'Ai cùng phòng với {entity}?',
        ],
        department: [
            'Có bao nhiêu người trong phòng {entity}?',
            'Ai là manager của phòng {entity}?',
            'Phòng {entity} đang làm dự án gì?',
            'Kỹ năng phổ biến nhất ở phòng {entity}?',
        ],
        project: [
            'Ai đang làm dự án {entity}?',
            'Thông tin chi tiết về dự án {entity}?',
            'Dự án {entity} dùng công nghệ gì?',
            'Trạng thái hiện tại của dự án {entity}?',
        ],
        skill: [
            'Có bao nhiêu người biết {entity}?',
            'Ai giỏi {entity} nhất?',
            'Dự án nào cần {entity}?',
            '{entity} thường đi kèm với kỹ năng nào?',
        ],
        count: [
            'Danh sách chi tiết?',
            'So sánh với phòng ban khác?',
            'Xu hướng theo thời gian?',
        ],
        list: [
            'Thống kê tổng quan?',
            'Lọc theo tiêu chí cụ thể?',
            'Export danh sách này?',
        ],
    };
    constructor(geminiService) {
        this.geminiService = geminiService;
    }
    async generateSuggestions(userQuery, assistantResponse, detectedEntities, queryType) {
        const suggestions = [];
        try {
            for (const entity of detectedEntities.slice(0, 2)) {
                const templates = this.templates[entity.type];
                if (templates) {
                    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
                    suggestions.push({
                        question: randomTemplate.replace('{entity}', entity.value),
                        category: 'related',
                        priority: 4,
                    });
                }
            }
            if (queryType.includes('count')) {
                suggestions.push({
                    question: 'Xem danh sách chi tiết?',
                    category: 'deeper',
                    priority: 5,
                });
            }
            else if (queryType.includes('list') || queryType.includes('search')) {
                suggestions.push({
                    question: 'Lọc theo tiêu chí khác?',
                    category: 'alternative',
                    priority: 3,
                });
            }
            if (assistantResponse.includes('nhân viên') ||
                assistantResponse.includes('người')) {
                suggestions.push({
                    question: 'Xem kỹ năng của họ?',
                    category: 'action',
                    priority: 4,
                });
            }
            if (suggestions.length < 2 && userQuery.length > 30) {
                const llmSuggestions = await this.generateWithLLM(userQuery, assistantResponse);
                suggestions.push(...llmSuggestions);
            }
            const unique = this.deduplicateSuggestions(suggestions);
            return unique.sort((a, b) => b.priority - a.priority).slice(0, 3);
        }
        catch (error) {
            this.logger.warn(`Error generating suggestions: ${error}`);
            return this.getFallbackSuggestions();
        }
    }
    async generateWithLLM(userQuery, assistantResponse) {
        try {
            const prompt = `Dựa trên cuộc hội thoại sau, đề xuất 2 câu hỏi follow-up ngắn gọn (dưới 50 ký tự mỗi câu).

User hỏi: "${userQuery}"
Trợ lý trả lời: "${assistantResponse.substring(0, 300)}..."

Trả về JSON array với format:
[{"question": "câu hỏi 1"}, {"question": "câu hỏi 2"}]

Chỉ trả về JSON, không có text khác.`;
            const response = await this.geminiService.generateResponse(prompt, 'Bạn là AI assistant giúp đề xuất câu hỏi.');
            const cleaned = response
                .replace(/```json\s*/, '')
                .replace(/```\s*$/, '')
                .trim();
            const parsed = JSON.parse(cleaned);
            return parsed.map((p) => ({
                question: p.question,
                category: 'deeper',
                priority: 3,
            }));
        }
        catch (error) {
            this.logger.warn(`LLM suggestion failed: ${error}`);
            return [];
        }
    }
    getFallbackSuggestions() {
        return [
            {
                question: 'Thống kê tổng quan hệ thống?',
                category: 'alternative',
                priority: 2,
            },
            {
                question: 'Danh sách nhân viên?',
                category: 'alternative',
                priority: 2,
            },
        ];
    }
    deduplicateSuggestions(suggestions) {
        const seen = new Set();
        return suggestions.filter((s) => {
            const normalized = s.question
                .toLowerCase()
                .replace(/[?!.,]/g, '')
                .trim();
            if (seen.has(normalized))
                return false;
            seen.add(normalized);
            return true;
        });
    }
    generateQuickSuggestions(queryType, mentionedEntities) {
        const suggestions = [];
        if (queryType.includes('employee') || queryType.includes('nhân viên')) {
            suggestions.push({ question: 'Tổng số nhân viên?', category: 'related', priority: 4 }, {
                question: 'Nhân viên theo phòng ban?',
                category: 'alternative',
                priority: 3,
            });
        }
        if (queryType.includes('project') || queryType.includes('dự án')) {
            suggestions.push({ question: 'Dự án đang active?', category: 'related', priority: 4 }, {
                question: 'Dự án nào có nhiều người nhất?',
                category: 'deeper',
                priority: 3,
            });
        }
        if (queryType.includes('skill') || queryType.includes('kỹ năng')) {
            suggestions.push({
                question: 'Kỹ năng phổ biến nhất?',
                category: 'related',
                priority: 4,
            }, {
                question: 'Ai có nhiều kỹ năng nhất?',
                category: 'deeper',
                priority: 3,
            });
        }
        if (suggestions.length === 0) {
            suggestions.push({ question: 'Thống kê nhân sự?', category: 'alternative', priority: 2 }, { question: 'Danh sách dự án?', category: 'alternative', priority: 2 });
        }
        return suggestions.slice(0, 3);
    }
};
exports.SuggestedQuestionsService = SuggestedQuestionsService;
exports.SuggestedQuestionsService = SuggestedQuestionsService = SuggestedQuestionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [gemini_service_1.GeminiService])
], SuggestedQuestionsService);
//# sourceMappingURL=suggested-questions.service.js.map