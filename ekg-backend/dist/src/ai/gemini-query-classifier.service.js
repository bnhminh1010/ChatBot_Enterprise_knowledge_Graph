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

⚠️ **CRITICAL PRIORITY RULES** - Kiểm tra ĐẦU TIÊN trước khi apply SIMPLE/MEDIUM/COMPLEX:

🔴 NẾU câu hỏi có BẤT KỲ filter/condition keywords sau → LUÔN LÀ MEDIUM filter-search:
   - Keywords kỹ năng: "biết", "có kỹ năng", "thành thạo", "giỏi", "skill", "sử dụng" + tên công nghệ (React, Python, Java, Docker...)
   - Keywords phòng ban: "phòng", "department", "team", "bộ phận" + tên (Frontend, Backend, QA, DevOps...)
   - Keywords chức danh: "chức danh", "position", "vị trí", "cấp bậc" + level (Junior, Senior, Lead, Manager...)
   - Keywords dự án: "dự án", "project", "làm việc tại", "tham gia" + tên dự án
   
   VD CRITICAL:
   ✅ ĐÚNG: "Danh sách nhân viên biết React" → MEDIUM filter-search với skill="React"
   ✅ ĐÚNG: "Ai biến Python" → MEDIUM filter-search với skill="Python"
   ✅ ĐÚNG: "Nhân viên phòng Frontend" → MEDIUM filter-search với department="Frontend"
   ❌ SAI: "Danh sách nhân viên" (không có filter) → SIMPLE list-employees

CLASSIFICATION RULES:

**SIMPLE** (queries đơn giản, KHÔNG CÓ filter/condition):
- Liệt kê TẤT CẢ không filter: "Danh sách nhân viên", "Tất cả dự án", "List all departments"
  → type: list-employees, list-departments, list-projects, list-skills
- Tìm theo ID: "Mã NV001", "ID: DP02", "Nhân viên NS021"
  → type: get-by-id
- Đếm tổng: "Bao nhiêu nhân viên", "Số lượng phòng ban"  
  → type: count-simple

**MEDIUM** (queries có filter, semantic search hoặc vector search):
- Tìm kiếm theo filter: "Nhân viên phòng Frontend", "Người có kỹ năng Python", "Ai biết React"
  → type: filter-search
- Semantic search: "Ai giỏi về React", "Người thành thạo Machine Learning"
  → type: semantic-search
- Relationship queries: "Ai làm việc cùng X", "Team của dự án Y"
  → type: relationship-query
- Aggregation có điều kiện: "Bao nhiêu người có kinh nghiệm > 3 năm"
  → type: conditional-aggregate

**COMPLEX** (queries yêu cầu phân tích, reasoning, multi-step):
- Phân tích: "Phân tích kỹ năng của team Frontend"
  → type: analysis
- Đề xuất: "Đề xuất training plan cho Backend team"
  → type: recommendation
- Multi-step reasoning: "Nếu thêm 5 người vào Frontend thì cần kỹ năng gì"
  → type: multi-step-reasoning

ENTITIES:
- skill: Tên kỹ năng/công nghệ (Python, React, Java, Docker, etc.)
- department: Tên phòng ban (Frontend, Backend, QA, DevOps, HR, etc.)
- project: Tên dự án
- position: Chức danh (Junior, Senior, Lead, Manager, etc.)
- employeeName: Tên nhân viên cụ thể
- id: Mã định danh
- experience: Số năm kinh nghiệm
- count: true nếu yêu cầu đếm

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