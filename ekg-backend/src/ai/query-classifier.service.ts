import { Injectable } from '@nestjs/common';

export interface QueryClassificationResult {
  level: 'simple' | 'medium' | 'complex';
  type: string;
  value?: string;
  keywords: string[];
}

@Injectable()
export class QueryClassifierService {
  /**
   * Phân loại độ khó của query
   * - simple: list, search, get-by-id (dùng Neo4j)
   * - medium: filter, aggregate, comparison (dùng ChromaDB + Neo4j)
   * - complex: reasoning, insights, suggestions (dùng Gemini)
   */
  classifyQuery(message: string): QueryClassificationResult {
    const lower = message.toLowerCase().trim();

    // ============ SIMPLE QUERIES ============
    // List employees
    if (
      /danh sách|list|tất cả|all/i.test(lower) &&
      /nhân viên|employee|staff|people/i.test(lower)
    ) {
      return {
        level: 'simple',
        type: 'list-employees',
        keywords: ['list', 'employees'],
      };
    }

    // List departments
    if (
      /danh sách|list|tất cả|all/i.test(lower) &&
      /phòng ban|department|dept/i.test(lower)
    ) {
      return {
        level: 'simple',
        type: 'list-departments',
        keywords: ['list', 'departments'],
      };
    }

    // List skills
    if (
      /danh sách|list|tất cả|all/i.test(lower) &&
      /kỹ năng|skill|competency/i.test(lower)
    ) {
      return {
        level: 'simple',
        type: 'list-skills',
        keywords: ['list', 'skills'],
      };
    }

    // List projects
    if (
      /danh sách|list|tất cả|all/i.test(lower) &&
      /dự án|project|initiative/i.test(lower)
    ) {
      return {
        level: 'simple',
        type: 'list-projects',
        keywords: ['list', 'projects'],
      };
    }

    // Search (global)
    if (/tìm|search|find|lookup/i.test(lower) && !lower.includes('danh sách')) {
      const value = this.extractSearchValue(lower);
      return {
        level: 'simple',
        type: 'search-global',
        value,
        keywords: ['search'],
      };
    }

    // Get employee by name
    if (/nhân viên|employee|staff/i.test(lower) && /tên|name/i.test(lower)) {
      const value = this.extractSearchValue(lower);
      return {
        level: 'simple',
        type: 'get-employee',
        value,
        keywords: ['employee', 'get'],
      };
    }

    // Get department by name
    if (/phòng ban|department|dept/i.test(lower) && /tên|name/i.test(lower)) {
      const value = this.extractSearchValue(lower);
      return {
        level: 'simple',
        type: 'get-department',
        value,
        keywords: ['department', 'get'],
      };
    }

    // ============ MEDIUM QUERIES ============
    // Count/aggregate
    if (/có bao nhiêu|count|statistics|tổng cộng|bao nhiêu/i.test(lower)) {
      return {
        level: 'medium',
        type: 'aggregate',
        keywords: ['count', 'aggregate'],
      };
    }

    // Filter/search with criteria
    if (
      /tìm kiếm|filter|where|có|with|có|dưới|trên/i.test(lower) &&
      /kỹ năng|skill|department|phòng ban/i.test(lower)
    ) {
      return {
        level: 'medium',
        type: 'filter-search',
        keywords: ['filter', 'search'],
      };
    }

    // Comparison
    if (/so sánh|compare|khác nhau|giống|tương tự/i.test(lower)) {
      return {
        level: 'medium',
        type: 'compare',
        keywords: ['compare'],
      };
    }

    // Relationship query
    if (
      /công việc|project|dự án|skill|kỹ năng|team|nhóm/i.test(lower) &&
      /của|liên quan|relation|work|belong/i.test(lower)
    ) {
      return {
        level: 'medium',
        type: 'relationship',
        keywords: ['relationship'],
      };
    }

    // ============ COMPLEX QUERIES ============
    // Recommendation/suggestion
    if (/giới thiệu|tư vấn|đề xuất|recommend|gợi ý|suggest/i.test(lower)) {
      return {
        level: 'complex',
        type: 'recommend',
        keywords: ['recommend'],
      };
    }

    // Analysis/insight
    if (/phân tích|analysis|analyze|insight|thống kê|analysis/i.test(lower)) {
      return {
        level: 'complex',
        type: 'analyze',
        keywords: ['analyze'],
      };
    }

    // Planning/creation
    if (/tạo|create|planning|lên kế hoạch|build|design/i.test(lower)) {
      return {
        level: 'complex',
        type: 'create',
        keywords: ['create'],
      };
    }

    // Reasoning/question
    if (/tại sao|why|như thế nào|how|là gì|what/i.test(lower)) {
      return {
        level: 'complex',
        type: 'reasoning',
        keywords: ['reasoning'],
      };
    }

    // Default: unknown - treat as complex
    return {
      level: 'complex',
      type: 'unknown',
      keywords: ['unknown'],
    };
  }

  /**
   * Trích xuất giá trị tìm kiếm từ message
   */
  private extractSearchValue(message: string): string {
    // Loại bỏ keywords phổ biến
    const cleaned = message
      .replace(/tìm|search|find|lookup|danh sách|list/gi, '')
      .replace(/nhân viên|employee|staff|phòng ban|department|skill|kỹ năng|dự án|project/gi, '')
      .replace(/^(cho|với|của|từ|là|được)\s+/gi, '')
      .trim();

    // Trích xuất từ trong dấu ngoặc kép hoặc apostrophe
    const quoted = message.match(/["']([^"']+)["']/);
    if (quoted) return quoted[1];

    return cleaned || '';
  }
}
