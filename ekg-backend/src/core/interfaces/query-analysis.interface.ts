/**
 * Query Analysis Interfaces
 * Định nghĩa các types cho Query Understanding Layer
 */

export enum IntentType {
  GET_INFO = 'get_info',           // Lấy thông tin cụ thể: "thông tin nhân viên X"
  SEARCH = 'search',                // Tìm kiếm: "tìm nhân viên biết React"
  COUNT = 'count',                  // Đếm: "có bao nhiêu nhân viên"
  COMPARE = 'compare',              // So sánh: "so sánh dự án A và B"
  AGGREGATE = 'aggregate',          // Tổng hợp: "tổng số nhân viên theo phòng ban"
  LIST = 'list',                    // Liệt kê: "danh sách tất cả dự án"
  ANALYZE = 'analyze',              // Phân tích: "phân tích kỹ năng của team"
  GREETING = 'greeting',            // Chào hỏi
  GENERAL_KNOWLEDGE = 'general_knowledge', // Kiến thức chung
  UPLOAD = 'upload',                // Upload tài liệu
}

export enum EntityType {
  PERSON = 'person',                // Nhân viên, người
  DEPARTMENT = 'department',        // Phòng ban
  PROJECT = 'project',              // Dự án
  SKILL = 'skill',                  // Kỹ năng
  TECHNOLOGY = 'technology',        // Công nghệ
  POSITION = 'position',            // Chức danh
  DOCUMENT = 'document',            // Tài liệu
  COMPANY = 'company',              // Công ty
  LOCATION = 'location',            // Địa điểm
  DATE = 'date',                    // Ngày tháng
  NUMBER = 'number',                // Số lượng
}

export interface Entity {
  type: EntityType;
  value: string;                    // Giá trị gốc
  normalizedValue?: string;         // Giá trị chuẩn hóa
  confidence: number;               // 0-1
  startIndex?: number;              // Vị trí trong query
  endIndex?: number;
  metadata?: Record<string, any>;   // Thông tin thêm
}

export interface Intent {
  type: IntentType;
  confidence: number;               // 0-1
  entities: Entity[];               // Entities liên quan đến intent này
  requiredTools?: string[];         // Tools cần thiết
  priority: number;                 // Thứ tự ưu tiên (cho multi-intent)
}

export interface QueryComplexity {
  level: 'simple' | 'medium' | 'complex';
  score: number;                    // 0-100
  factors: {
    multiIntent: boolean;
    entityCount: number;
    requiresReasoning: boolean;
    requiresAggregation: boolean;
    requiresComparison: boolean;
  };
}

export interface QueryAnalysisResult {
  originalQuery: string;
  normalizedQuery: string;          // Query sau khi normalize
  intents: Intent[];                // Tất cả intents detected
  mainIntent: Intent;               // Intent chính
  entities: Entity[];               // Tất cả entities
  complexity: QueryComplexity;
  suggestedTools: string[];         // Tools nên dùng
  needsContext: boolean;            // Cần context từ conversation history?
  ambiguities?: string[];           // Các điểm không rõ ràng
  confidence: number;               // Overall confidence (0-1)
  metadata?: {
    processingTime: number;
    geminiUsed: boolean;
    fallbackUsed: boolean;
  };
}

/**
 * Context cho Query Analysis
 */
export interface QueryAnalysisContext {
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  previousEntities?: Entity[];      // Entities từ queries trước
  userPreferences?: {
    preferredFormat?: 'table' | 'list' | 'paragraph';
    department?: string;
    role?: string;
  };
}
