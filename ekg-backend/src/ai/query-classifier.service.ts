import { Injectable } from '@nestjs/common';

export interface QueryClassificationResult {
  level: 'simple' | 'medium' | 'complex';
  type: string;
  value?: string;
  keywords: string[];
  confidence: number;  // NEW: Confidence score 0-1
  filters?: {
    department?: string;
    skill?: string;
    project?: string;
    position?: string;
    experience?: number;
  };
}

@Injectable()
export class QueryClassifierService {
  // ============ PHASE 1: EXPANDED PATTERNS ============
  
  private readonly simplePatterns = {
    'list-all': [
      /^(danh sách|list|tất cả|all)/i,
    ],
    'get-by-id': [
      /^(mã|id|code)\s*:?\s*[A-Z0-9]+/i,
    ],
    'count-simple': [
      /^(bao nhiêu|how many|số lượng)/i,
    ],
  };

  private readonly mediumPatterns = {
    // Semantic search - ChromaDB handles well
    'semantic-search': [
      /tìm.*người.*(giỏi|chuyên|thành thạo)/i,
      /ai.*(có kinh nghiệm|biết|làm được)/i,
      /nhân viên.*(chuyên|giỏi về)/i,
      /(có|sở hữu).*(kỹ năng|skill)/i,
      /thành thạo/i,
      /expert.*in/i,
    ],
    
    // Filtered lists - ChromaDB + Neo4j
    'filtered-list': [
      /danh sách.*(có|với|trong)/i,
      /liệt kê.*người/i,
      /những ai.*(trong|ở|thuộc)/i,
      /nhân viên.*phòng/i,
    ],
    
    // Aggregation with conditions - Neo4j can handle
    'conditional-aggregate': [
      /bao nhiêu.*người.*(có|với)/i,
      /số lượng.*(dự án|nhân viên).*của/i,
      /tổng.*trong/i,
      /đếm.*có/i,
    ],
    
    // Relationship queries - Neo4j graph traversal
    'relationship-query': [
      /.*làm việc (cùng|với)/i,
      /.*cùng phòng ban/i,
      /.*tham gia dự án/i,
      /quản lý.*ai/i,
      /thuộc.*team/i,
      /đồng nghiệp.*của/i,
    ],
    
    // Comparison queries - Data retrieval + simple logic
    'comparison-simple': [
      /so sánh.*(số lượng|kỹ năng)/i,
      /(nhiều|ít) hơn/i,
      /phòng ban.*nào.*(nhiều|ít)/i,
    ],
    
    // Experience filtering
    'experience-filter': [
      /.*\d+\s*năm.*kinh nghiệm/i,
      /kinh nghiệm.*trên.*\d+/i,
      /senior|junior|fresher/i,
    ],
  };

  private readonly complexPatterns = {
    // Analysis & Insights - Requires reasoning
    'analysis': [
      /phân tích.*(khả năng|hiệu quả|tình hình)/i,
      /đánh giá.*(performance|năng lực)/i,
      /insight|xu hướng|trend/i,
      /vì sao|tại sao.*và/i,  // "Why" questions with reasoning
      /nguyên nhân.*là gì/i,
    ],
    
    // Recommendations - Requires decision making
    'recommendation': [
      /đề xuất.*(kế hoạch|chiến lược|training)/i,
      /nên.*(thuê|tuyển|sa thải)/i,
      /recommend|suggest/i,
      /phù hợp nhất cho/i,
      /ai.*nên.*làm/i,
    ],
    
    // Multi-step reasoning
    'multi-step-reasoning': [
      /nếu.*thì.*còn/i,
      /giả sử.*sẽ.*như thế nào/i,
      /dự đoán|forecast|predict/i,
      /kế hoạch.*cụ thể/i,
    ],
    
    // Complex comparisons with reasoning
    'complex-comparison': [
      /so sánh.*và.*đề xuất/i,
      /.*tốt hơn.*vì/i,
      /lợi ích.*khi.*so với/i,
    ],
    
    // Open-ended questions
    'open-ended': [
      /làm thế nào để/i,
      /cách.*tốt nhất/i,
      /hướng dẫn.*chi tiết/i,
    ],
  };

  /**
   * PHASE 1: Classify with confidence scoring
   */
  classifyQuery(message: string): QueryClassificationResult {
    const lower = message.toLowerCase().trim();

    // Calculate scores for each level
    const simpleScore = this.calculateSimpleScore(lower);
    const mediumScore = this.calculateMediumScore(lower);
    const complexScore = this.calculateComplexScore(lower);

    // Determine level based on highest score
    const scores = { simple: simpleScore, medium: mediumScore, complex: complexScore };
    const level = (Object.keys(scores) as Array<'simple' | 'medium' | 'complex'>)
      .reduce((a, b) => scores[a] > scores[b] ? a : b);

    // Get query type and details based on level
    const result = this.getQueryDetails(message, lower, level);
    
    return {
      ...result,
      level,
      confidence: scores[level],
    };
  }

  private calculateSimpleScore(query: string): number {
    let score = 0;
    
    // Basic list query
    if (/^(danh sách|list)\s+(nhân viên|phòng ban|dự án|kỹ năng)$/i.test(query)) {
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
      if (patterns.some(p => p.test(query))) {
        score += 0.3;
      }
    }
    
    // Penalize if has complex keywords
    if (/phân tích|đánh giá|đề xuất|tại sao|vì sao/i.test(query)) {
      score -= 0.5;
    }
    
    return Math.max(0, Math.min(1, score));
  }

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
      if (patterns.some(p => p.test(query))) {
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
      if (patterns.some(p => p.test(query))) {
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

  private getQueryDetails(
    original: string,
    lower: string,
    level: 'simple' | 'medium' | 'complex'
  ): Omit<QueryClassificationResult, 'level' | 'confidence'> {
    // Extract filters
    const filters = {
      department: this.extractDepartmentName(original),
      skill: this.extractSkillName(original),
      project: this.extractProjectName(original),
      experience: this.extractExperience(original),
    };

    // Determine query type based on patterns
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
      // complex
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

  private extractDepartmentName(query: string): string | undefined {
    const match = query.match(/phòng\s+([a-záàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ\s]+)/i);
    return match ?.[1]?.trim();
  }

  private extractSkillName(query: string): string | undefined {
    const match = query.match(/(python|java|javascript|react|angular|vue|nestjs|node|sql|nosql|ai|ml|machine learning|deep learning|devops|docker|kubernetes)/i);
    return match?.[0];
  }

  private extractProjectName(query: string): string | undefined {
    const match = query.match(/dự án\s+([a-záàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ0-9\s]+)/i);
    return match?.[1]?.trim();
  }

  private extractExperience(query: string): number | undefined {
    const match = query.match(/(\d+)\s*năm/i);
    return match ? parseInt(match[1]) : undefined;
  }

  private extractSearchValue(query: string): string | undefined {
    const match = query.match(/tìm\s+(.+)/i) || query.match(/search\s+(.+)/i);
    return match?.[1]?.trim();
  }
}
