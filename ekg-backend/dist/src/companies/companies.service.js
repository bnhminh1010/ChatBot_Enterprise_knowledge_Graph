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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompaniesService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../core/neo4j/neo4j.service");
let CompaniesService = class CompaniesService {
    neo;
    constructor(neo) {
        this.neo = neo;
    }
    async list() {
        try {
            const rows = await this.neo.run(`MATCH (c:CongTy)
         RETURN {
           id: c.id,
           code: c.id,
           name: c.ten,
           field: c.linh_vuc,
           employeeCount: c.so_nhan_su,
           founded: c.founded,
           domain: c.domain
         } AS company
         ORDER BY c.ten`);
            return rows.map(r => r.company);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async findByName(name) {
        try {
            const rows = await this.neo.run(`MATCH (c:CongTy)
         WHERE toLower(c.ten) CONTAINS toLower($name) OR toLower(c.id) CONTAINS toLower($name)
         RETURN {
           id: c.id,
           code: c.id,
           name: c.ten,
           field: c.linh_vuc,
           employeeCount: c.so_nhan_su,
           founded: c.founded,
           domain: c.domain
         } AS company
         LIMIT 1`, { name });
            if (!rows[0])
                throw new common_1.NotFoundException(`Company "${name}" not found`);
            return rows[0].company;
        }
        catch (e) {
            if (e instanceof common_1.NotFoundException)
                throw e;
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
};
exports.CompaniesService = CompaniesService;
exports.CompaniesService = CompaniesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], CompaniesService);
//# sourceMappingURL=companies.service.js.map