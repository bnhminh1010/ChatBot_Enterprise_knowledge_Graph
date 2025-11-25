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
exports.DepartmentsService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../core/neo4j/neo4j.service");
let DepartmentsService = class DepartmentsService {
    neo;
    constructor(neo) {
        this.neo = neo;
    }
    async list() {
        try {
            const rows = await this.neo.run(`MATCH (p:PhongBan)
         RETURN {
           id: p.code,
           code: p.code,
           name: p.ten,
           description: COALESCE(p.description, '')
         } AS dept
         ORDER BY p.ten`);
            return rows.map((r) => r.dept);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async get(code) {
        try {
            const rows = await this.neo.run(`MATCH (p:PhongBan {code:$code}) 
         RETURN {
           id: p.code,
           code: p.code,
           name: p.ten,
           description: COALESCE(p.description, '')
         } AS dept`, { code });
            if (!rows[0])
                throw new common_1.NotFoundException('Department not found');
            return rows[0].dept;
        }
        catch (e) {
            if (e instanceof common_1.NotFoundException)
                throw e;
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async findByName(name) {
        try {
            const rows = await this.neo.run(`MATCH (p:PhongBan)
         WHERE toLower(p.ten) CONTAINS toLower($name) OR toLower(p.code) CONTAINS toLower($name)
         RETURN {
           id: p.code,
           code: p.code,
           name: p.ten,
           description: COALESCE(p.description, '')
         } AS dept
         LIMIT 1`, { name });
            if (!rows[0])
                throw new common_1.NotFoundException(`Department "${name}" not found`);
            return rows[0].dept;
        }
        catch (e) {
            if (e instanceof common_1.NotFoundException)
                throw e;
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async create(dto) {
        try {
            await this.neo.run(`MERGE (p:PhongBan {code:$code}) ON CREATE SET p.ten=$ten`, dto);
            return { ok: true };
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async update(code, dto) {
        try {
            const res = await this.neo.run(`MATCH (p:PhongBan {code:$code})
         SET p.ten = coalesce($ten, p.ten)
         RETURN p{.*} AS dept`, { code, ten: dto.ten });
            if (!res[0])
                throw new common_1.NotFoundException('Department not found');
            return res[0].dept;
        }
        catch (e) {
            if (e instanceof common_1.NotFoundException)
                throw e;
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async remove(code) {
        try {
            const res = await this.neo.run(`MATCH (p:PhongBan {code:$code}) RETURN p LIMIT 1`, { code });
            if (!res[0])
                throw new common_1.NotFoundException('Department not found');
            await this.neo.run(`MATCH (p:PhongBan {code:$code}) DETACH DELETE p`, {
                code,
            });
            return { ok: true };
        }
        catch (e) {
            if (e instanceof common_1.NotFoundException)
                throw e;
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async searchByCode(code) {
        try {
            const rows = await this.neo.run(`MATCH (p:PhongBan)
         WHERE toLower(p.ma) CONTAINS toLower($code)
         RETURN {
           id: p.id,
           code: p.ma,
           name: p.ten,
           headcount: p.so_nhan_su_du_kien,
           email: p.email_lien_he
         } AS dept
         ORDER BY p.ten`, { code });
            return rows.map((r) => r.dept);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async searchByHeadcount(headcount) {
        try {
            const rows = await this.neo.run(`MATCH (p:PhongBan)
         WHERE p.so_nhan_su_du_kien = $headcount
         RETURN {
           id: p.id,
           code: p.ma,
           name: p.ten,
           headcount: p.so_nhan_su_du_kien,
           email: p.email_lien_he
         } AS dept
         ORDER BY p.ten`, { headcount });
            return rows.map((r) => r.dept);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async searchByEmail(email) {
        try {
            const rows = await this.neo.run(`MATCH (p:PhongBan)
         WHERE toLower(p.email_lien_he) CONTAINS toLower($email)
         RETURN {
           id: p.id,
           code: p.ma,
           name: p.ten,
           headcount: p.so_nhan_su_du_kien,
           email: p.email_lien_he
         } AS dept
         ORDER BY p.ten`, { email });
            return rows.map((r) => r.dept);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async getById(id) {
        try {
            const rows = await this.neo.run(`MATCH (p:PhongBan {id: $id})
         OPTIONAL MATCH (p)-[:CO_NHAN_SU]->(e:NhanSu)
         RETURN {
           id: p.id,
           code: p.ma,
           name: p.ten,
           headcount: p.so_nhan_su_du_kien,
           email: p.email_lien_he,
           employees: collect(DISTINCT {id: e.id, name: e.ho_ten})
         } AS dept`, { id });
            if (!rows[0])
                throw new common_1.NotFoundException('Department not found');
            return rows[0].dept;
        }
        catch (e) {
            if (e instanceof common_1.NotFoundException)
                throw e;
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async count() {
        try {
            const rows = await this.neo.run(`MATCH (p:PhongBan)
         RETURN count(p) AS total`);
            return rows[0]?.total?.toNumber() || 0;
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
};
exports.DepartmentsService = DepartmentsService;
exports.DepartmentsService = DepartmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], DepartmentsService);
//# sourceMappingURL=departments.service.js.map