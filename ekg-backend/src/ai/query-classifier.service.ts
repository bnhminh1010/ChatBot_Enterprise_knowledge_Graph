/**
 * @fileoverview Query Classifier Service - Pattern-based Query Classification
 * @module ai/query-classifier.service
 *
 * Service phân loại query thành 3 levels: simple, medium, complex.
 * Sử dụng pattern matching và confidence scoring để xác định loại query.
 *
 * Levels:
 * - simple: list, get-by-id, count
 * - medium: semantic search, filtered list, relationship query
 * - complex: analysis, recommendation, multi-step reasoning
 *
 * @author APTX3107 Team
 */
import { Injectable } from '@nestjs/common';

/**
 * Kết quả phân loại query.
 */
export interface QueryClassificationResult {
  /** Level phân loại: simple | medium | complex */
  level: 'simple' | 'medium' | 'complex';
  /** Loại query cụ thể (list-employees, semantic-search, analysis, ...) */
  type: string;
  /** Giá trị trích xuất được (nếu có) */
  value?: string;
  /** Keywords phát hiện được */
  keywords: string[];
  /** Độ tin cậy của phân loại (0-1) */
  confidence: number;
  /** Các filters trích xuất được từ query */
  filters?: {
    department?: string;
    skill?: string;
    project?: string;
    position?: string;
    experience?: number;
  };
}

/**
 * Service phân loại query theo pattern matching.
 * Tính confidence score cho mỗi level và chọn level có score cao nhất.
 *
 * @example
 * const result = queryClassifierService.classifyQuery('ai biết React?');
 * // { level: 'medium', type: 'semantic-search', confidence: 0.85 }
 */
@Injectable()
export class QueryClassifierService {
  // ============ SIMPLE PATTERNS ============
  private readonly simplePatterns = {
    'list-all': [/^(danh sách|list|tất cả|all)/i],
    'get-by-id': [/^(mã|id|code)\s*:?\s*[A-Z0-9]+/i],
    'count-simple': [/^(bao nhiêu|how many|số lượng)/i],
  };

  // ============ MEDIUM PATTERNS ============
  private readonly mediumPatterns = {
    'semantic-search': [
      /tìm.*người.*(giỏi|chuyên|thành thạo)/i,
      /ai.*(có kinh nghiệm|biết|làm được)/i,
      /nhân viên.*(chuyên|giỏi về)/i,
      /(có|sở hữu).*(kỹ năng|skill)/i,
      /thành thạo/i,
      /expert.*in/i,
    ],
    'filtered-list': [
      /danh sách.*(có|với|trong)/i,
      /liệt kê.*người/i,
      /những ai.*(trong|ở|thuộc)/i,
      /nhân viên.*phòng/i,
    ],
    'conditional-aggregate': [
      /bao nhiêu.*người.*(có|với)/i,
      /số lượng.*(dự án|nhân viên).*của/i,
      /tổng.*trong/i,
      /đếm.*có/i,
    ],
    'relationship-query': [
      /.*làm việc (cùng|với)/i,
      /.*cùng phòng ban/i,
      /.*tham gia dự án/i,
      /quản lý.*ai/i,
      /thuộc.*team/i,
      /đồng nghiệp.*của/i,
    ],
    'comparison-simple': [
      /so sánh.*(số lượng|kỹ năng)/i,
      /(nhiều|ít) hơn/i,
      /phòng ban.*nào.*(nhiều|ít)/i,
    ],
    'experience-filter': [
      /.*\d+\s*năm.*kinh nghiệm/i,
      /kinh nghiệm.*trên.*\d+/i,
      /senior|junior|fresher/i,
    ],
  };

  // ============ COMPLEX PATTERNS ============
  private readonly complexPatterns = {
    analysis: [
      /phân tích.*(khả năng|hiệu quả|tình hình)/i,
      /đánh giá.*(performance|năng lực)/i,
      /insight|xu hướng|trend/i,
      /vì sao|tại sao.*và/i,
      /nguyên nhân.*là gì/i,
    ],
    recommendation: [
      /đề xuất.*(kế hoạch|chiến lược|training)/i,
      /nên.*(thuê|tuyển|sa thải)/i,
      /recommend|suggest/i,
      /phù hợp nhất cho/i,
      /ai.*nên.*làm/i,
    ],
    'multi-step-reasoning': [
      /nếu.*thì.*còn/i,
      /giả sử.*sẽ.*như thế nào/i,
      /dự đoán|forecast|predict/i,
      /kế hoạch.*cụ thể/i,
    ],
    'complex-comparison': [
      /so sánh.*và.*đề xuất/i,
      /.*tốt hơn.*vì/i,
      /lợi ích.*khi.*so với/i,
    ],
    'open-ended': [
      /làm thế nào để/i,
      /cách.*tốt nhất/i,
      /hướng dẫn.*chi tiết/i,
    ],
  };

  /**
   * Phân loại query với confidence scoring.
   * Tính score cho mỗi level và chọn level có score cao nhất.
   *
   * @param message - Query cần phân loại
   * @returns Kết quả phân loại với level, type, confidence
   */
  classifyQuery(message: string): QueryClassificationResult {
    const lower = message.toLowerCase().trim();

    // Calculate scores for each level
    const simpleScore = this.calculateSimpleScore(lower);
    const mediumScore = this.calculateMediumScore(lower);
    const complexScore = this.calculateComplexScore(lower);

    // Determine level based on highest score
    const scores = {
      simple: simpleScore,
      medium: mediumScore,
      complex: complexScore,
    };
    const level = (
      Object.keys(scores) as Array<'simple' | 'medium' | 'complex'>
    ).reduce((a, b) => (scores[a] > scores[b] ? a : b));

    // Get query type and details based on level
    const result = this.getQueryDetails(message, lower, level);

    return {
      ...result,
      level,
      confidence: scores[level],
    };
  }

  /**
   * Tính score cho simple level.
   */
  private calculateSimpleScore(query: string): number {
    let score = 0;

    // Basic list query
    if (
      /^(danh sách|list)\s+(nhân viên|phòng ban|dự án|kỹ năng)$/i.test(query)
    ) {
      score += 0.9;
    }

    // Get by ID
    if (/^(mã|id|code|tìm)\s*:?\s*[A-Z]{2}\d+/i.test(query)) {
      score += 0.95;
    }

    // Simple count
    if (/^(bao nhiêu|số lượng)\s+(nhân viên|phòng ban|dự án)$/i.test(query)) {
      score += 0.9;
    }

    // Pattern matching
    for (const patterns of Object.values(this.simplePatterns)) {
      if (patterns.some((p) => p.test(query))) {
        score += 0.3;
      }
    }

    // Penalize if has complex keywords
    if (/phân tích|đánh giá|đề xuất|tại sao|vì sao/i.test(query)) {
      score -= 0.5;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Tính score cho medium level.
   */
  private calculateMediumScore(query: string): number {
    let score = 0;

    // Filtered queries
    if (/(danh sách|tìm|liệt kê).*(có|với|trong|thuộc)/i.test(query)) {
      score += 0.6;
    }

    // Semantic search indicators
    if (/(giỏi|chuyên|thành thạo|kinh nghiệm)/i.test(query)) {
      score += 0.5;
    }

    // Relationship queries
    if (/(làm việc cùng|cùng phòng|tham gia|quản lý)/i.test(query)) {
      score += 0.6;
    }

    // Pattern matching
    for (const patterns of Object.values(this.mediumPatterns)) {
      if (patterns.some((p) => p.test(query))) {
        score += 0.4;
      }
    }

    // Boost if has skill/department/project context
    if (/(python|java|react|phòng|dự án)/i.test(query)) {
      score += 0.2;
    }

    // Penalize if has complex reasoning keywords
    if (/(phân tích|đề xuất.*kế hoạch|tại sao.*và)/i.test(query)) {
      score -= 0.4;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Tính score cho complex level.
   */
  private calculateComplexScore(query: string): number {
    let score = 0;

    // Strong complex indicators
    if (/phân tích/i.test(query)) score += 0.7;
    if (/đánh giá/i.test(query)) score += 0.6;
    if (/đề xuất.*kế hoạch/i.test(query)) score += 0.8;
    if (/(tại sao|vì sao).*và/i.test(query)) score += 0.7;
    if (/nếu.*thì/i.test(query)) score += 0.6;

    // Pattern matching
    for (const patterns of Object.values(this.complexPatterns)) {
      if (patterns.some((p) => p.test(query))) {
        score += 0.5;
      }
    }

    // Multi-clause questions
    const clauses = query.split(/và|hoặc|nhưng/).length;
    if (clauses > 2) score += 0.3;

    // Question length (longer = more complex)
    if (query.split(' ').length > 15) score += 0.2;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Lấy chi tiết query (type, keywords, filters) dựa trên level.
   */
  private getQueryDetails(
    original: string,
    lower: string,
    level: 'simple' | 'medium' | 'complex',
  ): Omit<QueryClassificationResult, 'level' | 'confidence'> {
    // Extract filters
    const filters = {
      department: this.extractDepartmentName(original),
      skill: this.extractSkillName(original),
      project: this.extractProjectName(original),
      experience: this.extractExperience(original),
    };

    let type = 'unknown';
    let keywords: string[] = [];
    let value: string | undefined;

    if (level === 'simple') {
      if (/danh sách.*nhân viên/i.test(lower)) {
        type = 'list-employees';
        keywords = ['list', 'employees'];
      } else if (/danh sách.*phòng ban/i.test(lower)) {
        type = 'list-departments';
        keywords = ['list', 'departments'];
      } else if (/danh sách.*dự án/i.test(lower)) {
        type = 'list-projects';
        keywords = ['list', 'projects'];
      } else if (/^(mã|id|tìm)\s*:?\s*[A-Z]{2}\d+/i.test(original)) {
        type = 'get-by-id';
        value = original.match(/[A-Z]{2}\d+/)?.[0];
        keywords = ['get', 'id'];
      } else if (/bao nhiêu/i.test(lower)) {
        type = 'count';
        keywords = ['count'];
      } else {
        type = 'search-global';
        value = this.extractSearchValue(lower);
        keywords = ['search'];
      }
    } else if (level === 'medium') {
      if (/(giỏi|chuyên|thành thạo)/i.test(lower)) {
        type = 'semantic-search';
        keywords = ['semantic', 'search'];
      } else if (/(làm việc cùng|tham gia|quản lý)/i.test(lower)) {
        type = 'relationship-query';
        keywords = ['relationship'];
      } else if (/danh sách.*(có|với)/i.test(lower)) {
        type = 'filtered-list';
        keywords = ['filtered', 'list'];
      } else if (/bao nhiêu.*có/i.test(lower)) {
        type = 'conditional-aggregate';
        keywords = ['aggregate', 'condition'];
      } else {
        type = 'filter-search';
        keywords = ['filter', 'search'];
      }
    } else {
      if (/phân tích/i.test(lower)) {
        type = 'analysis';
        keywords = ['analysis'];
      } else if (/đề xuất/i.test(lower)) {
        type = 'recommendation';
        keywords = ['recommendation'];
      } else if (/tại sao|vì sao/i.test(lower)) {
        type = 'explanation';
        keywords = ['explanation', 'reasoning'];
      } else {
        type = 'complex-reasoning';
        keywords = ['complex', 'reasoning'];
      }
    }

    return { type, keywords, value, filters };
  }

  // ============ HELPER METHODS ============

  /**
   * Trích xuất tên phòng ban từ query.
   */
  private extractDepartmentName(query: string): string | undefined {
    const match = query.match(
      /phòng\s+([a-záàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ\s]+)/i,
    );
    return match?.[1]?.trim();
  }

  /**
   * Trích xuất tên kỹ năng từ query.
   */
  private extractSkillName(query: string): string | undefined {
    const match = query.match(
      /(python|java|javascript|react|angular|vue|nestjs|node|sql|nosql|ai|ml|machine learning|deep learning|devops|docker|kubernetes)/i,
    );
    return match?.[0];
  }

  /**
   * Trích xuất tên dự án từ query.
   */
  private extractProjectName(query: string): string | undefined {
    const match = query.match(
      /dự án\s+([a-záàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ0-9\s]+)/i,
    );
    return match?.[1]?.trim();
  }

  /**
   * Trích xuất số năm kinh nghiệm từ query.
   */
  private extractExperience(query: string): number | undefined {
    const match = query.match(/(\d+)\s*năm/i);
    return match ? parseInt(match[1]) : undefined;
  }

  /**
   * Trích xuất giá trị tìm kiếm từ query.
   */
  private extractSearchValue(query: string): string | undefined {
    const match = query.match(/tìm\s+(.+)/i) || query.match(/search\s+(.+)/i);
    return match?.[1]?.trim();
  }
}
