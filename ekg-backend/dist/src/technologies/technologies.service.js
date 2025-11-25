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
exports.TechnologiesService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../core/neo4j/neo4j.service");
let TechnologiesService = class TechnologiesService {
    neo;
    constructor(neo) {
        this.neo = neo;
    }
    async list() {
        try {
            const rows = await this.neo.run(`MATCH (t:CongNghe)
         RETURN {
           id: t.id,
           code: t.id,
           name: t.ten,
           type: t.loai,
           description: COALESCE(t.mo_ta, '')
         } AS tech
         ORDER BY t.ten`);
            return rows.map((r) => r.tech);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async findByName(name) {
        try {
            const rows = await this.neo.run(`MATCH (t:CongNghe)
         WHERE toLower(t.ten) CONTAINS toLower($name) OR toLower(t.id) CONTAINS toLower($name)
         RETURN {
           id: t.id,
           code: t.id,
           name: t.ten,
           type: t.loai,
           description: COALESCE(t.mo_ta, '')
         } AS tech
         LIMIT 1`, { name });
            if (!rows[0])
                throw new common_1.NotFoundException(`Technology "${name}" not found`);
            return rows[0].tech;
        }
        catch (e) {
            if (e instanceof common_1.NotFoundException)
                throw e;
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async search(filters) {
        try {
            let cypher = `MATCH (t:CongNghe) WHERE 1=1`;
            const params = {};
            if (filters.id) {
                cypher += ` AND toLower(t.id) = toLower($id)`;
                params.id = filters.id;
            }
            if (filters.name) {
                cypher += ` AND toLower(t.ten) CONTAINS toLower($name)`;
                params.name = filters.name;
            }
            if (filters.type) {
                cypher += ` AND toLower(t.loai) CONTAINS toLower($type)`;
                params.type = filters.type;
            }
            if (filters.description) {
                cypher += ` AND toLower(t.mo_ta) CONTAINS toLower($description)`;
                params.description = filters.description;
            }
            if (filters.keyword) {
                cypher += ` AND (
          toLower(t.ten) CONTAINS toLower($keyword) OR 
          toLower(t.id) CONTAINS toLower($keyword) OR 
          toLower(t.loai) CONTAINS toLower($keyword) OR
          toLower(t.mo_ta) CONTAINS toLower($keyword)
        )`;
                params.keyword = filters.keyword;
            }
            cypher += ` RETURN {
        id: t.id,
        code: t.id,
        name: t.ten,
        type: t.loai,
        description: COALESCE(t.mo_ta, '')
      } AS tech ORDER BY t.loai, t.ten LIMIT 20`;
            const rows = await this.neo.run(cypher, params);
            return rows.map((r) => r.tech);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async count() {
        try {
            const rows = await this.neo.run(`MATCH (t:CongNghe)
         RETURN count(t) AS total`);
            return rows[0]?.total?.toNumber() || 0;
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
};
exports.TechnologiesService = TechnologiesService;
exports.TechnologiesService = TechnologiesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], TechnologiesService);
//# sourceMappingURL=technologies.service.js.map