import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from './gemini.service';

export interface GeminiClassificationResult {
  level: 'simple' | 'medium' | 'complex'; // Backward compatible, nhưng chỉ dùng medium|complex
  type: string;
  normalizedQuery: string;
  extractedEntities: {
    department?: string;
    skill?: string;
    project?: string;
    position?: string;
    employeeName?: string;
    group?: string;
    unit?: string;
    document?: string;
    technology?: string;
    id?: string;
    count?: boolean;
    experience?: number;
  };
  confidence: number;
  reasoning: string;
}

@Injectable()
export class GeminiQueryClassifierService {
  private readonly logger = new Logger(GeminiQueryClassifierService.name);

  constructor(private readonly geminiService: GeminiService) {}

  /**
   * Classify query using Gemini AI
   */
  async classifyQueryWithGemini(
    query: string,
  ): Promise<GeminiClassificationResult> {
    try {
      const prompt = this.buildClassificationPrompt(query);
      const response = await this.geminiService.classifyQuery(prompt);
      const result = this.parseGeminiResponse(response);

      this.logger.debug(
        `Gemini classified: "${query}" => ${result.level} (${result.type}) - confidence: ${result.confidence}`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Gemini classification failed: ${error}`);
      throw error;
    }
  }

  /**
   * Build classification prompt for Gemini
   */
  private buildClassificationPrompt(query: string): string {
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

  /**
   * Parse Gemini response to ClassificationResult
   */
  private parseGeminiResponse(response: string): GeminiClassificationResult {
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = response.trim();
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '');
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '');
      cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
      cleanedResponse = cleanedResponse.trim();

      const parsed = JSON.parse(cleanedResponse);

      // Validate required fields
      if (!parsed.level || !parsed.type || !parsed.normalizedQuery) {
        throw new Error('Missing required fields in Gemini response');
      }

      // Ensure extractedEntities exists
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
    } catch (error) {
      this.logger.error(`Failed to parse Gemini response: ${error}`);
      this.logger.debug(`Raw response: ${response}`);
      throw new Error(`Invalid Gemini response format: ${error.message}`);
    }
  }
}
