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
    classifyQuery(message) {
        const lower = message.toLowerCase().trim();
        if (/danh sách|list|tất cả|all/i.test(lower) &&
            /nhân viên|employee|staff|people/i.test(lower)) {
            return {
                level: 'simple',
                type: 'list-employees',
                keywords: ['list', 'employees'],
            };
        }
        if (/danh sách|list|tất cả|all/i.test(lower) &&
            /phòng ban|department|dept/i.test(lower)) {
            return {
                level: 'simple',
                type: 'list-departments',
                keywords: ['list', 'departments'],
            };
        }
        if (/danh sách|list|tất cả|all/i.test(lower) &&
            /kỹ năng|skill|competency/i.test(lower)) {
            return {
                level: 'simple',
                type: 'list-skills',
                keywords: ['list', 'skills'],
            };
        }
        if (/danh sách|list|tất cả|all/i.test(lower) &&
            /dự án|project|initiative/i.test(lower)) {
            return {
                level: 'simple',
                type: 'list-projects',
                keywords: ['list', 'projects'],
            };
        }
        if (/tìm|search|find|lookup/i.test(lower) && !lower.includes('danh sách')) {
            const value = this.extractSearchValue(lower);
            return {
                level: 'simple',
                type: 'search-global',
                value,
                keywords: ['search'],
            };
        }
        if (/nhân viên|employee|staff/i.test(lower) && /tên|name/i.test(lower)) {
            const value = this.extractSearchValue(lower);
            return {
                level: 'simple',
                type: 'get-employee',
                value,
                keywords: ['employee', 'get'],
            };
        }
        if (/phòng ban|department|dept/i.test(lower) && /tên|name/i.test(lower)) {
            const value = this.extractSearchValue(lower);
            return {
                level: 'simple',
                type: 'get-department',
                value,
                keywords: ['department', 'get'],
            };
        }
        if (/có bao nhiêu|count|statistics|tổng cộng|bao nhiêu/i.test(lower)) {
            return {
                level: 'medium',
                type: 'aggregate',
                keywords: ['count', 'aggregate'],
            };
        }
        if (/tìm kiếm|filter|where|có|with|có|dưới|trên/i.test(lower) &&
            /kỹ năng|skill|department|phòng ban/i.test(lower)) {
            return {
                level: 'medium',
                type: 'filter-search',
                keywords: ['filter', 'search'],
            };
        }
        if (/so sánh|compare|khác nhau|giống|tương tự/i.test(lower)) {
            return {
                level: 'medium',
                type: 'compare',
                keywords: ['compare'],
            };
        }
        if (/công việc|project|dự án|skill|kỹ năng|team|nhóm/i.test(lower) &&
            /của|liên quan|relation|work|belong/i.test(lower)) {
            return {
                level: 'medium',
                type: 'relationship',
                keywords: ['relationship'],
            };
        }
        if (/giới thiệu|tư vấn|đề xuất|recommend|gợi ý|suggest/i.test(lower)) {
            return {
                level: 'complex',
                type: 'recommend',
                keywords: ['recommend'],
            };
        }
        if (/phân tích|analysis|analyze|insight|thống kê|analysis/i.test(lower)) {
            return {
                level: 'complex',
                type: 'analyze',
                keywords: ['analyze'],
            };
        }
        if (/tạo|create|planning|lên kế hoạch|build|design/i.test(lower)) {
            return {
                level: 'complex',
                type: 'create',
                keywords: ['create'],
            };
        }
        if (/tại sao|why|như thế nào|how|là gì|what/i.test(lower)) {
            return {
                level: 'complex',
                type: 'reasoning',
                keywords: ['reasoning'],
            };
        }
        return {
            level: 'complex',
            type: 'unknown',
            keywords: ['unknown'],
        };
    }
    extractSearchValue(message) {
        const cleaned = message
            .replace(/tìm|search|find|lookup|danh sách|list/gi, '')
            .replace(/nhân viên|employee|staff|phòng ban|department|skill|kỹ năng|dự án|project/gi, '')
            .replace(/^(cho|với|của|từ|là|được)\s+/gi, '')
            .trim();
        const quoted = message.match(/["']([^"']+)["']/);
        if (quoted)
            return quoted[1];
        return cleaned || '';
    }
};
exports.QueryClassifierService = QueryClassifierService;
exports.QueryClassifierService = QueryClassifierService = __decorate([
    (0, common_1.Injectable)()
], QueryClassifierService);
//# sourceMappingURL=query-classifier.service.js.map