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
         WITH p, collect(DISTINCT c.ten) AS techs
         RETURN {
           id: p.id,
           key: p.ma,
           name: p.ten,
           status: COALESCE(p.trang_thai, 'Active'),
           technologies: techs
         } AS prj
         ORDER BY p.ten`);
            return rows.map((r) => r.prj);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async getFull(key) {
        try {
            const rows = await this.neo.run(`MATCH (p:DuAn {id:$key})
         OPTIONAL MATCH (p)-[:SU_DUNG_CONG_NGHE]->(tech:CongNghe)
         OPTIONAL MATCH (e:NhanSu)-[:LAM_DU_AN]->(p)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]->(e)
         RETURN {
           id: p.id,
           key: p.ma,
           name: p.ten,
           status: COALESCE(p.trang_thai, 'Active'),
           technologies: collect(DISTINCT tech.ten),
           employees: collect(DISTINCT e{ id: e.id, empId: e.id, name: e.ho_ten, position: e.chucDanh }),
           departments: collect(DISTINCT pb{ id: pb.id, code: pb.ma, name: pb.ten })
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
            await this.neo.run(`MERGE (p:DuAn {ma:$key})
         ON CREATE SET p.ten=$ten, p.trang_thai=coalesce($trang_thai,'Active')`, { key: dto.key, ten: dto.ten, trang_thai: dto.trang_thai });
            return { ok: true };
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async searchByClient(client) {
        try {
            const rows = await this.neo.run(`MATCH (p:DuAn)
         WHERE toLower(p.khach_hang) CONTAINS toLower($client)
         RETURN {
           id: p.id,
           key: p.ma,
           name: p.ten,
           client: p.khach_hang,
           field: p.linh_vuc,
           type: p.loai,
           startDate: toString(p.start_date),
           status: p.trang_thai
         } AS prj
         ORDER BY p.ten`, { client });
            return rows.map((r) => r.prj);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async searchByField(field) {
        try {
            const rows = await this.neo.run(`MATCH (p:DuAn)
         WHERE toLower(p.linh_vuc) CONTAINS toLower($field)
         RETURN {
           id: p.id,
           key: p.ma,
           name: p.ten,
           client: p.khach_hang,
           field: p.linh_vuc,
           type: p.loai,
           startDate: toString(p.start_date),
           status: p.trang_thai
         } AS prj
         ORDER BY p.ten`, { field });
            return rows.map((r) => r.prj);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async searchByType(type) {
        try {
            const rows = await this.neo.run(`MATCH (p:DuAn)
         WHERE toLower(p.loai) CONTAINS toLower($type)
         RETURN {
           id: p.id,
           key: p.ma,
           name: p.ten,
           client: p.khach_hang,
           field: p.linh_vuc,
           type: p.loai,
           startDate: toString(p.start_date),
           status: p.trang_thai
         } AS prj
         ORDER BY p.ten`, { type });
            return rows.map((r) => r.prj);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async searchByCode(code) {
        try {
            const rows = await this.neo.run(`MATCH (p:DuAn)
         WHERE toLower(p.ma) CONTAINS toLower($code)
         RETURN {
           id: p.id,
           key: p.ma,
           name: p.ten,
           client: p.khach_hang,
           field: p.linh_vuc,
           type: p.loai,
           startDate: toString(p.start_date),
           status: p.trang_thai
         } AS prj
         ORDER BY p.ten`, { code });
            return rows.map((r) => r.prj);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async searchByStartDate(startDate) {
        try {
            const rows = await this.neo.run(`MATCH (p:DuAn)
         WHERE date(p.start_date) = date($startDate)
         RETURN {
           id: p.id,
           key: p.ma,
           name: p.ten,
           client: p.khach_hang,
           field: p.linh_vuc,
           type: p.loai,
           startDate: toString(p.start_date),
           status: p.trang_thai
         } AS prj
         ORDER BY p.ten`, { startDate });
            return rows.map((r) => r.prj);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async searchByStatus(status) {
        try {
            const rows = await this.neo.run(`MATCH (p:DuAn)
         WHERE toLower(p.trang_thai) = toLower($status)
         RETURN {
           id: p.id,
           key: p.ma,
           name: p.ten,
           client: p.khach_hang,
           field: p.linh_vuc,
           type: p.loai,
           startDate: toString(p.start_date),
           status: p.trang_thai
         } AS prj
         ORDER BY p.ten`, { status });
            return rows.map((r) => r.prj);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async getById(id) {
        try {
            const rows = await this.neo.run(`MATCH (p:DuAn {id: $id})
         OPTIONAL MATCH (p)-[:SU_DUNG_CONG_NGHE]->(tech:CongNghe)
         OPTIONAL MATCH (e:NhanSu)-[:LAM_DU_AN]->(p)
         RETURN {
           id: p.id,
           key: p.ma,
           name: p.ten,
           client: p.khach_hang,
           field: p.linh_vuc,
           type: p.loai,
           startDate: toString(p.start_date),
           status: p.trang_thai,
           technologies: collect(DISTINCT tech.ten),
           employees: collect(DISTINCT {id: e.id, name: e.ho_ten})
         } AS prj`, { id });
            if (!rows[0])
                throw new common_1.NotFoundException('Project not found');
            return rows[0].prj;
        }
        catch (e) {
            if (e instanceof common_1.NotFoundException)
                throw e;
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async count() {
        try {
            const rows = await this.neo.run(`MATCH (p:DuAn)
         RETURN count(p) AS total`);
            return rows[0]?.total?.toNumber() || 0;
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async getProjectManager(projectName) {
        try {
            const rows = await this.neo.run(`MATCH (p:DuAn)<-[:QUAN_LY]-(e:NhanSu)
         WHERE toLower(p.ten) CONTAINS toLower($projectName) OR toLower(p.ma) CONTAINS toLower($projectName)
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           position: e.chucDanh,
           email: e.email_cong_ty,
           project: p.ten
         } AS manager
         LIMIT 1`, { projectName });
            if (!rows[0])
                return null;
            return rows[0].manager;
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map