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
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../core/neo4j/neo4j.service");
let ProjectsService = class ProjectsService {
    neo;
    constructor(neo) {
        this.neo = neo;
    }
    async list() {
        try {
            const rows = await this.neo.run(`MATCH (p:DuAn)
         OPTIONAL MATCH (p)-[:SU_DUNG_CONG_NGHE]->(c:CongNghe)
         RETURN {
           id: p.key,
           key: p.key,
           name: p.ten,
           status: COALESCE(p.trangThai, 'Active'),
           technologies: collect(DISTINCT c.ten)
         } AS prj
         ORDER BY p.ten`);
            return rows.map(r => r.prj);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async getFull(key) {
        try {
            const rows = await this.neo.run(`MATCH (p:DuAn {key:$key})
         OPTIONAL MATCH (p)-[:SU_DUNG_CONG_NGHE]->(tech:CongNghe)
         OPTIONAL MATCH (e:NhanSu)-[:LAM_DU_AN]->(p)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]->(e)
         RETURN {
           id: p.key,
           key: p.key,
           name: p.ten,
           status: COALESCE(p.trangThai, 'Active'),
           technologies: collect(DISTINCT tech.ten),
           employees: collect(DISTINCT e{ id: e.empId, empId: e.empId, name: e.ten, position: e.chucDanh }),
           departments: collect(DISTINCT pb{ id: pb.code, code: pb.code, name: pb.ten })
         } AS full`, { key });
            if (!rows[0])
                throw new common_1.NotFoundException('Project not found');
            return rows[0].full;
        }
        catch (e) {
            if (e instanceof common_1.NotFoundException)
                throw e;
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async create(dto) {
        try {
            await this.neo.run(`MERGE (p:DuAn {key:$key})
         ON CREATE SET p.ten=$ten, p.trangThai=coalesce($trangThai,'Active')`, dto);
            return { ok: true };
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map