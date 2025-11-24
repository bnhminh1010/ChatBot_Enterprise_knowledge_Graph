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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillsService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const neo4j_service_1 = require("../core/neo4j/neo4j.service");
let SkillsService = class SkillsService {
    neo;
    constructor(neo) {
        this.neo = neo;
    }
    async list() {
        try {
            const rows = await this.neo.run(`MATCH (k:KyNang) 
         RETURN {
           id: k.ten,
           name: k.ten,
           category: COALESCE(k.category, '')
         } AS skill 
         ORDER BY k.ten`);
            return rows.map(r => r.skill);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async top(limit = 10) {
        try {
            const rows = await this.neo.run(`MATCH (:NhanSu)-[r:CO_KY_NANG]->(k:KyNang)
         RETURN k.ten AS skill, count(r) AS freq
         ORDER BY freq DESC
         LIMIT $limit`, { limit: neo4j_driver_1.default.int(limit) });
            return rows;
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async search(term) {
        try {
            const rows = await this.neo.run(`MATCH (k:KyNang) WHERE toLower(k.ten) CONTAINS toLower($term) 
         RETURN {
           id: k.ten,
           name: k.ten,
           category: COALESCE(k.category, '')
         } AS skill`, { term });
            return rows.map(r => r.skill);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async create(dto) {
        try {
            await this.neo.run(`MERGE (k:KyNang {ten:$ten})`, dto);
            return { ok: true };
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async addToEmployee(dto) {
        try {
            await this.neo.run(`MATCH (e:NhanSu {empId:$empId})
         MERGE (k:KyNang {ten:$ten})
         MERGE (e)-[r:CO_KY_NANG]->(k)
         SET r.level = coalesce($level, r.level, 1)`, { empId: dto.empId, ten: dto.ten, level: dto.level ?? 1 });
            return { ok: true };
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async related(ten, limit = 5) {
        try {
            const rows = await this.neo.run(`MATCH (e:NhanSu)-[:CO_KY_NANG]->(k1:KyNang {ten:$ten})
         MATCH (e)-[:CO_KY_NANG]->(k2:KyNang)
         WHERE k2 <> k1
         RETURN k2.ten AS skill, count(*) AS freq
         ORDER BY freq DESC
         LIMIT $limit`, { ten, limit: neo4j_driver_1.default.int(limit) });
            return rows;
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
};
exports.SkillsService = SkillsService;
exports.SkillsService = SkillsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], SkillsService);
//# sourceMappingURL=skills.service.js.map