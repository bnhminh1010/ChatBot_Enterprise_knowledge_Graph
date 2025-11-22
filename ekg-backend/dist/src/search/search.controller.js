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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var SearchController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const neo4j_service_1 = require("../core/neo4j/neo4j.service");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const search_query_dto_1 = require("./dto/search-query.dto");
let SearchController = SearchController_1 = class SearchController {
    neo;
    logger = new common_1.Logger(SearchController_1.name);
    constructor(neo) {
        this.neo = neo;
    }
    async search(query) {
        const q = query.q ?? '';
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;
        const unionBlock = `CALL {
         MATCH (e:NhanSu) WHERE toLower(e.ten) CONTAINS toLower($q)
         RETURN 'Employee' AS type, {id: e.empId, name: e.ten, position: e.chucDanh} AS data
         UNION
         MATCH (k:KyNang) WHERE toLower(k.ten) CONTAINS toLower($q)
         RETURN 'Skill' AS type, {id: k.ten, name: k.ten, category: COALESCE(k.category, '')} AS data
         UNION
         MATCH (p:DuAn) WHERE toLower(p.ten) CONTAINS toLower($q) OR toLower(p.key) CONTAINS toLower($q)
         RETURN 'Project' AS type, {id: p.key, key: p.key, name: p.ten, status: COALESCE(p.trangThai, 'Active')} AS data
       }`;
        try {
            const itemsRows = await this.neo.run(`${unionBlock}
         RETURN {type: type, data: data} AS res 
         SKIP $skip LIMIT $limit`, { q, skip: neo4j_driver_1.default.int(skip), limit: neo4j_driver_1.default.int(limit) });
            const items = itemsRows.map(r => r.res);
            const totalRows = await this.neo.run(`${unionBlock}
         RETURN count(*) AS total`, { q });
            const rawTotal = totalRows[0]?.total ?? 0;
            const total = rawTotal && typeof rawTotal.toNumber === 'function'
                ? rawTotal.toNumber()
                : Number(rawTotal);
            return { page, limit, total, items };
        }
        catch (error) {
            const errorMessage = error?.message || 'Database connection error';
            this.logger.error('Search error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
};
exports.SearchController = SearchController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Tìm kiếm chung (NhanSu, KyNang, DuAn) với phân trang' }),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_query_dto_1.SearchQueryDto]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "search", null);
exports.SearchController = SearchController = SearchController_1 = __decorate([
    (0, swagger_1.ApiTags)('Search'),
    (0, common_1.Controller)('search'),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], SearchController);
//# sourceMappingURL=search.controller.js.map