"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryClassifierService = void 0;
const common_1 = require("@nestjs/common");
let QueryClassifierService = class QueryClassifierService {
    simplePatterns = {
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
    mediumPatterns = {
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
    complexPatterns = {
        'analysis': [
            /phân tích.*(khả năng|hiệu quả|tình hình)/i,
            /đánh giá.*(performance|năng lực)/i,
            /insight|xu hướng|trend/i,
            /vì sao|tại sao.*và/i,
            /nguyên nhân.*là gì/i,
        ],
        'recommendation': [
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
    classifyQuery(message) {
        const lower = message.toLowerCase().trim();
        const simpleScore = this.calculateSimpleScore(lower);
        const mediumScore = this.calculateMediumScore(lower);
        const complexScore = this.calculateComplexScore(lower);
        const scores = { simple: simpleScore, medium: mediumScore, complex: complexScore };
        const level = Object.keys(scores)
            .reduce((a, b) => scores[a] > scores[b] ? a : b);
        const result = this.getQueryDetails(message, lower, level);
        return {
            ...result,
            level,
            confidence: scores[level],
        };
    }
    calculateSimpleScore(query) {
        let score = 0;
        if (/^(danh sách|list)\s+(nhân viên|phòng ban|dự án|kỹ năng)$/i.test(query)) {
            score += 0.9;
        }
        if (/^(mã|id|code|tìm)\s*:?\s*[A-Z]{2}\d+/i.test(query)) {
            score += 0.95;
        }
        if (/^(bao nhiêu|số lượng)\s+(nhân viên|phòng ban|dự án)$/i.test(query)) {
            score += 0.9;
        }
        for (const patterns of Object.values(this.simplePatterns)) {
            if (patterns.some(p => p.test(query))) {
                score += 0.3;
            }
        }
        if (/phân tích|đánh giá|đề xuất|tại sao|vì sao/i.test(query)) {
            score -= 0.5;
        }
        return Math.max(0, Math.min(1, score));
    }
    calculateMediumScore(query) {
        let score = 0;
        if (/(danh sách|tìm|liệt kê).*(có|với|trong|thuộc)/i.test(query)) {
            score += 0.6;
        }
        if (/(giỏi|chuyên|thành thạo|kinh nghiệm)/i.test(query)) {
            score += 0.5;
        }
        if (/(làm việc cùng|cùng phòng|tham gia|quản lý)/i.test(query)) {
            score += 0.6;
        }
        for (const patterns of Object.values(this.mediumPatterns)) {
            if (patterns.some(p => p.test(query))) {
                score += 0.4;
            }
        }
        if (/(python|java|react|phòng|dự án)/i.test(query)) {
            score += 0.2;
        }
        if (/(phân tích|đề xuất.*kế hoạch|tại sao.*và)/i.test(query)) {
            score -= 0.4;
        }
        return Math.max(0, Math.min(1, score));
    }
    calculateComplexScore(query) {
        let score = 0;
        if (/phân tích/i.test(query))
            score += 0.7;
        if (/đánh giá/i.test(query))
            score += 0.6;
        if (/đề xuất.*kế hoạch/i.test(query))
            score += 0.8;
        if (/(tại sao|vì sao).*và/i.test(query))
            score += 0.7;
        if (/nếu.*thì/i.test(query))
            score += 0.6;
        for (const patterns of Object.values(this.complexPatterns)) {
            if (patterns.some(p => p.test(query))) {
                score += 0.5;
            }
        }
        const clauses = query.split(/và|hoặc|nhưng/).length;
        if (clauses > 2)
            score += 0.3;
        if (query.split(' ').length > 15)
            score += 0.2;
        return Math.max(0, Math.min(1, score));
    }
    getQueryDetails(original, lower, level) {
        const filters = {
            department: this.extractDepartmentName(original),
            skill: this.extractSkillName(original),
            project: this.extractProjectName(original),
            experience: this.extractExperience(original),
        };
        let type = 'unknown';
        let keywords = [];
        let value;
        if (level === 'simple') {
            if (/danh sách.*nhân viên/i.test(lower)) {
                type = 'list-employees';
                keywords = ['list', 'employees'];
            }
            else if (/danh sách.*phòng ban/i.test(lower)) {
                type = 'list-departments';
                keywords = ['list', 'departments'];
            }
            else if (/danh sách.*dự án/i.test(lower)) {
                type = 'list-projects';
                keywords = ['list', 'projects'];
            }
            else if (/^(mã|id|tìm)\s*:?\s*[A-Z]{2}\d+/i.test(original)) {
                type = 'get-by-id';
                value = original.match(/[A-Z]{2}\d+/)?.[0];
                keywords = ['get', 'id'];
            }
            else if (/bao nhiêu/i.test(lower)) {
                type = 'count';
                keywords = ['count'];
            }
            else {
                type = 'search-global';
                value = this.extractSearchValue(lower);
                keywords = ['search'];
            }
        }
        else if (level === 'medium') {
            if (/(giỏi|chuyên|thành thạo)/i.test(lower)) {
                type = 'semantic-search';
                keywords = ['semantic', 'search'];
            }
            else if (/(làm việc cùng|tham gia|quản lý)/i.test(lower)) {
                type = 'relationship-query';
                keywords = ['relationship'];
            }
            else if (/danh sách.*(có|với)/i.test(lower)) {
                type = 'filtered-list';
                keywords = ['filtered', 'list'];
            }
            else if (/bao nhiêu.*có/i.test(lower)) {
                type = 'conditional-aggregate';
                keywords = ['aggregate', 'condition'];
            }
            else {
                type = 'filter-search';
                keywords = ['filter', 'search'];
            }
        }
        else {
            if (/phân tích/i.test(lower)) {
                type = 'analysis';
                keywords = ['analysis'];
            }
            else if (/đề xuất/i.test(lower)) {
                type = 'recommendation';
                keywords = ['recommendation'];
            }
            else if (/tại sao|vì sao/i.test(lower)) {
                type = 'explanation';
                keywords = ['explanation', 'reasoning'];
            }
            else {
                type = 'complex-reasoning';
                keywords = ['complex', 'reasoning'];
            }
        }
        return { type, keywords, value, filters };
    }
    extractDepartmentName(query) {
        const match = query.match(/phòng\s+([a-záàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ\s]+)/i);
        return match?.[1]?.trim();
    }
    extractSkillName(query) {
        const match = query.match(/(python|java|javascript|react|angular|vue|nestjs|node|sql|nosql|ai|ml|machine learning|deep learning|devops|docker|kubernetes)/i);
        return match?.[0];
    }
    extractProjectName(query) {
        const match = query.match(/dự án\s+([a-záàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ0-9\s]+)/i);
        return match?.[1]?.trim();
    }
    extractExperience(query) {
        const match = query.match(/(\d+)\s*năm/i);
        return match ? parseInt(match[1]) : undefined;
    }
    extractSearchValue(query) {
        const match = query.match(/tìm\s+(.+)/i) || query.match(/search\s+(.+)/i);
        return match?.[1]?.trim();
    }
};
exports.QueryClassifierService = QueryClassifierService;
exports.QueryClassifierService = QueryClassifierService = __decorate([
    (0, common_1.Injectable)()
], QueryClassifierService);
//# sourceMappingURL=query-classifier.service.js.map