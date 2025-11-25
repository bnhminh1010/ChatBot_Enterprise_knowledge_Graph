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
var GeminiQueryClassifierService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiQueryClassifierService = void 0;
const common_1 = require("@nestjs/common");
const gemini_service_1 = require("./gemini.service");
let GeminiQueryClassifierService = GeminiQueryClassifierService_1 = class GeminiQueryClassifierService {
    geminiService;
    logger = new common_1.Logger(GeminiQueryClassifierService_1.name);
    constructor(geminiService) {
        this.geminiService = geminiService;
    }
    async classifyQueryWithGemini(query) {
        try {
            const prompt = this.buildClassificationPrompt(query);
            const response = await this.geminiService.classifyQuery(prompt);
            const result = this.parseGeminiResponse(response);
            this.logger.debug(`Gemini classified: "${query}" => ${result.level} (${result.type}) - confidence: ${result.confidence}`);
            return result;
        }
        catch (error) {
            this.logger.error(`Gemini classification failed: ${error}`);
            throw error;
        }
    }
    buildClassificationPrompt(query) {
        return `Bạn là chuyên gia phân loại câu hỏi cho hệ thống Enterprise Knowledge Graph của công ty APTX3107.

NHIỆM VỤ:
1. Phân loại câu hỏi thành 3 levels: simple, medium, complex
2. Chuẩn hóa câu hỏi thành dạng dễ xử lý
3. Trích xuất entities (department, skill, project, position, name, experience, id)
4. Xác định loại query cụ thể

CLASSIFICATION RULES:

**SIMPLE** (queries đơn giản, chỉ cần query database trực tiếp):
- Liệt kê danh sách: "Danh sách nhân viên", "List departments", "Tất cả dự án", "Danh sách nhóm", "Các đơn vị", "Danh sách công nghệ", "Các chức danh", "Danh sách địa điểm", "Thông tin công ty"
  → type: list-employees, list-departments, list-projects, list-skills, list-groups, list-units, list-documents, list-technologies, list-positions, list-locations, list-companies
- Tìm theo ID/code: "Mã NV001", "ID: DP02", "Employee E001", "Tên của nhân viên có id là NS021"
  → type: get-by-id
- Đếm số lượng đơn giản: "Bao nhiêu nhân viên", "Số lượng phòng ban", "Có bao nhiêu nhóm"
  → type: count-simple
- Tìm kiếm global đơn giản: "Tìm Nguyễn Văn A"
  → type: search-global

**MEDIUM** (queries phức tạp hơn, cần filter, semantic search hoặc vector search):
- Tìm kiếm theo filter: "Nhân viên phòng Frontend", "Người có kỹ năng Python", "Nhóm thuộc đơn vị X"
  → type: filter-search
- Semantic search: "Ai giỏi về React", "Người thành thạo Machine Learning"
  → type: semantic-search
- Relationship queries: "Ai làm việc cùng X", "Team của dự án Y", "Nhóm này có những ai"
  → type: relationship-query
- Aggregation với điều kiện: "Bao nhiêu người có kinh nghiệm > 3 năm"
  → type: conditional-aggregate
- So sánh đơn giản: "Phòng nào có nhiều người nhất"
  → type: comparison-simple

**COMPLEX** (queries yêu cầu phân tích, reasoning, hoặc multi-step):
- Phân tích: "Phân tích kỹ năng của team Frontend"
  → type: analysis
- Đề xuất: "Đề xuất training plan cho Backend team"
  → type: recommendation
- Multi-step reasoning: "Nếu thêm 5 người vào Frontend thì cần kỹ năng gì"
  → type: multi-step-reasoning
- So sánh phức tạp: "So sánh năng lực 2 team và đề xuất"
  → type: complex-comparison
- Câu hỏi mở: "Làm thế nào để cải thiện productivity"
  → type: open-ended

ENTITIES:
- department: Tên phòng ban (Frontend, Backend, QA, DevOps, HR, etc.)
- skill: Tên kỹ năng (Python, React, Java, Docker, etc.)
- project: Tên dự án
- position: Chức danh (Junior, Senior, Lead, Manager, etc.)
- employeeName: Tên nhân viên cụ thể
- group: Tên nhóm (Nhom)
- unit: Tên đơn vị (DonVi)
- document: Tên tài liệu (TaiLieu)
- technology: Tên công nghệ (CongNghe)
- id: Mã định danh (ID, Code) của đối tượng (VD: NS021, DP01, ...)
- experience: Số năm kinh nghiệm (nếu có)
- count: true nếu câu hỏi yêu cầu đếm số lượng

USER QUERY: "${query}"

Trả về JSON hợp lệ (chỉ JSON, không có markdown):
{
  "level": "simple|medium|complex",
  "type": "loại query cụ thể",
  "normalizedQuery": "Câu hỏi đã được chuẩn hóa và làm rõ",
  "extractedEntities": {
    "department": "...",
    "skill": "...",
    "project": "...",
    "position": "...",
    "employeeName": "...",
    "group": "...",
    "unit": "...",
    "document": "...",
    "technology": "...",
    "id": "...",
    "experience": số nguyên,
    "count": true/false
  },
  "confidence": 0.0-1.0,
  "reasoning": "Giải thích ngắn gọn tại sao classify như vậy"
}`;
    }
    parseGeminiResponse(response) {
        try {
            let cleanedResponse = response.trim();
            cleanedResponse = cleanedResponse.replace(/^```json\s*/, '');
            cleanedResponse = cleanedResponse.replace(/^```\s*/, '');
            cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
            cleanedResponse = cleanedResponse.trim();
            const parsed = JSON.parse(cleanedResponse);
            if (!parsed.level || !parsed.type || !parsed.normalizedQuery) {
                throw new Error('Missing required fields in Gemini response');
            }
            if (!parsed.extractedEntities) {
                parsed.extractedEntities = {};
            }
            return {
                level: parsed.level,
                type: parsed.type,
                normalizedQuery: parsed.normalizedQuery,
                extractedEntities: parsed.extractedEntities,
                confidence: parsed.confidence || 0.8,
                reasoning: parsed.reasoning || 'No reasoning provided',
            };
        }
        catch (error) {
            this.logger.error(`Failed to parse Gemini response: ${error}`);
            this.logger.debug(`Raw response: ${response}`);
            throw new Error(`Invalid Gemini response format: ${error.message}`);
        }
    }
};
exports.GeminiQueryClassifierService = GeminiQueryClassifierService;
exports.GeminiQueryClassifierService = GeminiQueryClassifierService = GeminiQueryClassifierService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [gemini_service_1.GeminiService])
], GeminiQueryClassifierService);
//# sourceMappingURL=gemini-query-classifier.service.js.map