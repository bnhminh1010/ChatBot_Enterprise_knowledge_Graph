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
exports.PositionsService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../core/neo4j/neo4j.service");
let PositionsService = class PositionsService {
    neo;
    constructor(neo) {
        this.neo = neo;
    }
    async list() {
        try {
            const rows = await this.neo.run(`MATCH (p:ChucDanh)
         RETURN {
           id: p.id,
           code: p.id,
           name: p.ten,
           description: COALESCE(p.mo_ta_ngan, ''),
           level: p.cap_bac,
           group: p.nhom_nghe
         } AS position
         ORDER BY p.ten`);
            return rows.map((r) => r.position);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async findByName(name) {
        try {
            const rows = await this.neo.run(`MATCH (p:ChucDanh)
         WHERE toLower(p.ten) CONTAINS toLower($name) OR toLower(p.id) CONTAINS toLower($name)
         RETURN {
           id: p.id,
           code: p.id,
           name: p.ten,
           description: COALESCE(p.mo_ta_ngan, ''),
           level: p.cap_bac,
           group: p.nhom_nghe
         } AS position
         LIMIT 1`, { name });
            if (!rows[0])
                throw new common_1.NotFoundException(`Position "${name}" not found`);
            return rows[0].position;
        }
        catch (e) {
            if (e instanceof common_1.NotFoundException)
                throw e;
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async search(filters) {
        try {
            let cypher = `MATCH (p:ChucDanh) WHERE 1=1`;
            const params = {};
            if (filters.name) {
                cypher += ` AND toLower(p.ten) CONTAINS toLower($name)`;
                params.name = filters.name;
            }
            if (filters.level) {
                cypher += ` AND toLower(p.cap_bac) = toLower($level)`;
                params.level = filters.level;
            }
            if (filters.group) {
                cypher += ` AND toLower(p.nhom_nghe) CONTAINS toLower($group)`;
                params.group = filters.group;
            }
            if (filters.keyword) {
                cypher += ` AND (
          toLower(p.ten) CONTAINS toLower($keyword) OR 
          toLower(p.id) CONTAINS toLower($keyword) OR 
          toLower(p.mo_ta_ngan) CONTAINS toLower($keyword)
        )`;
                params.keyword = filters.keyword;
            }
            cypher += ` RETURN {
        id: p.id,
        code: p.id,
        name: p.ten,
        description: COALESCE(p.mo_ta_ngan, ''),
        level: p.cap_bac,
        group: p.nhom_nghe
      } AS position ORDER BY p.cap_bac, p.ten LIMIT 20`;
            const rows = await this.neo.run(cypher, params);
            return rows.map((r) => r.position);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async count() {
        try {
            const rows = await this.neo.run(`MATCH (p:ChucDanh)
         RETURN count(p) AS total`);
            return rows[0]?.total?.toNumber() || 0;
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
};
exports.PositionsService = PositionsService;
exports.PositionsService = PositionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], PositionsService);
//# sourceMappingURL=positions.service.js.map