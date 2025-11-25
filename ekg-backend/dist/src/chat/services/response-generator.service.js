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
var ResponseGeneratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseGeneratorService = void 0;
const common_1 = require("@nestjs/common");
const gemini_service_1 = require("../../ai/gemini.service");
let ResponseGeneratorService = ResponseGeneratorService_1 = class ResponseGeneratorService {
    geminiService;
    logger = new common_1.Logger(ResponseGeneratorService_1.name);
    constructor(geminiService) {
        this.geminiService = geminiService;
    }
    async generate(data, intent, context, plan) {
        try {
            if (typeof data === 'string') {
                return await this.enhanceResponse(data, intent, context);
            }
            const prompt = this.buildResponsePrompt(data, intent, context, plan);
            const response = await this.geminiService.generateResponse(prompt, 'Bạn là trợ lý AI thông minh cho hệ thống HR APTX3107.');
            const withFollowUps = await this.addFollowUpSuggestions(response, context, intent);
            this.logger.debug(`Generated natural response for intent: ${intent.primary}`);
            return withFollowUps;
        }
        catch (error) {
            this.logger.error(`Failed to generate response: ${error}`);
            return this.fallbackStructuredResponse(data, intent);
        }
    }
    buildResponsePrompt(data, intent, context, plan) {
        const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
        const historyStr = context.history
            .slice(-3)
            .map(m => `${m.role}: ${m.content}`)
            .join('\n');
        return `Bạn là trợ lý AI thông minh của hệ thống HR doanh nghiệp APTX3107.

DỮ LIỆU TỪ DATABASE:
\`\`\`json
${dataStr}
\`\`\`

CONTEXT HỘI THOẠI:
${historyStr || 'Chưa có lịch sử'}

USER INTENT: ${intent.primary}
TOPICS: ${context.currentTopic.join(', ') || 'Chưa rõ'}
MOOD: ${context.mood}

NHIỆM VỤ:
1. **Tóm tắt dữ liệu bằng ngôn ngữ tự nhiên** - KHÔNG liệt kê bullet points trừ khi dữ liệu quá nhiều
2. **Highlight insights quan trọng** - Sử dụng **Bold** cho điểm chính
3. **Giải thích lý do** nếu là analysis/recommendation
4. **Sử dụng emoji phù hợp** (📊 👥 💡 🎯 ⚠️ ✅) để làm rõ ý
5. **Markdown formatting**: 
   - \`Code\` cho tên entities (nhân viên, phòng ban, kỹ năng)
   - **Bold** cho số liệu quan trọng
   - Tables nếu so sánh nhiều items

STYLE:
- ${context.mood === 'formal' ? 'Chuyên nghiệp, súc tích' : 'Thân thiện, dễ hiểu'}
- Tiếng Việt tự nhiên, giống con người
- Đoạn văn ngắn (2-3 câu/đoạn)
- Kết thúc bằng insight hoặc câu hỏi mở

KHÔNG:
- Bịa đặt thông tin không có trong data
- Dùng "Dựa trên dữ liệu trên..." (redundant)
- Liệt kê tất cả items nếu quá 5 (chỉ highlight top items)

Hãy trả lời natural và insightful:`;
    }
    async enhanceResponse(response, intent, context) {
        if (response.includes('**') || response.includes('`')) {
            return await this.addFollowUpSuggestions(response, context, intent);
        }
        const prompt = `Cải thiện response sau để tự nhiên và professional hơn:

RESPONSE GỐC:
${response}

NHIỆM VỤ:
1. Format lại với Markdown (\`code\`, **bold**, emoji)
2. Thêm insights nếu có thể
3. Giữ nguyên ý nghĩa, chỉ cải thiện presentation

Trả về response đã cải thiện:`;
        try {
            const enhanced = await this.geminiService.generateResponse(prompt, 'Bạn là chuyên gia UX writing.');
            return await this.addFollowUpSuggestions(enhanced, context, intent);
        }
        catch (error) {
            return await this.addFollowUpSuggestions(response, context, intent);
        }
    }
    async addFollowUpSuggestions(response, context, intent) {
        const suggestions = this.generateFollowUpSuggestions(context, intent);
        if (suggestions.length === 0) {
            return response;
        }
        const followUpSection = `\n\n---\n\n💡 **Câu hỏi gợi ý:**\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
        return response + followUpSection;
    }
    generateFollowUpSuggestions(context, intent) {
        const suggestions = [];
        const topics = context.currentTopic;
        if (intent.primary === 'search') {
            if (topics.includes('employees')) {
                suggestions.push('Bạn muốn xem chi tiết kỹ năng của những người này không?');
                suggestions.push('Hoặc tôi có thể phân tích gap skills của team?');
            }
            if (topics.includes('departments')) {
                suggestions.push('Bạn có muốn so sánh hiệu suất các phòng ban không?');
            }
        }
        if (intent.primary === 'analyze') {
            suggestions.push('Bạn có muốn xem đề xuất cải thiện không?');
            suggestions.push('Tôi có thể so sánh với các phòng ban khác?');
        }
        if (intent.primary === 'compare') {
            suggestions.push('Bạn có muốn đề xuất các hành động cụ thể không?');
        }
        if (topics.includes('skills') && !suggestions.length) {
            suggestions.push('Bạn có muốn xem training plan cho team không?');
        }
        return suggestions.slice(0, 3);
    }
    fallbackStructuredResponse(data, intent) {
        if (Array.isArray(data)) {
            const count = data.length;
            const items = data
                .slice(0, 5)
                .map((item, i) => `${i + 1}. ${item.name || JSON.stringify(item)}`)
                .join('\n');
            return `Tìm thấy ${count} kết quả:\n\n${items}${count > 5 ? `\n\n... và ${count - 5} kết quả khác` : ''}`;
        }
        if (typeof data === 'object') {
            return `Kết quả:\n${JSON.stringify(data, null, 2)}`;
        }
        return String(data);
    }
    async addExplanation(response, plan) {
        if (!plan || plan.steps.length <= 1) {
            return response;
        }
        const explanation = `\n\n🔍 **Chi tiết xử lý:**\n` +
            plan.steps.map((step, i) => `${i + 1}. ${step.type} từ ${step.dataSource}`).join('\n');
        return response + explanation;
    }
};
exports.ResponseGeneratorService = ResponseGeneratorService;
exports.ResponseGeneratorService = ResponseGeneratorService = ResponseGeneratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [gemini_service_1.GeminiService])
], ResponseGeneratorService);
//# sourceMappingURL=response-generator.service.js.map