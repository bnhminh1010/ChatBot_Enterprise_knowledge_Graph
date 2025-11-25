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
var EmployeesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeesService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const neo4j_service_1 = require("../core/neo4j/neo4j.service");
let EmployeesService = EmployeesService_1 = class EmployeesService {
    neo;
    logger = new common_1.Logger(EmployeesService_1.name);
    constructor(neo) {
        this.neo = neo;
    }
    async list(skip = 0, limit = 20) {
        try {
            const rows = await this.neo.run(`MATCH (e:NhanSu)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         WITH e, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           position: e.chucDanh,
           skills: skills
         } AS emp
         ORDER BY e.ho_ten
         SKIP $skip LIMIT $limit`, { skip: neo4j_driver_1.default.int(skip), limit: neo4j_driver_1.default.int(limit) });
            return rows.map((r) => r.emp);
        }
        catch (e) {
            if (e instanceof common_1.NotFoundException)
                throw e;
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Employees list error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
    async findByName(name, skip = 0, limit = 0) {
        try {
            const cypherQuery = `MATCH (e:NhanSu)
         WHERE toLower(e.ho_ten) CONTAINS toLower($name)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         WITH e, pb, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           position: e.chucDanh,
           department: COALESCE(pb.ten, 'N/A'),
           skills: skills
         } AS emp
         ORDER BY e.ho_ten
         SKIP $skip ${limit > 0 ? 'LIMIT $limit' : ''}`;
            const rows = await this.neo.run(cypherQuery, {
                name,
                skip: neo4j_driver_1.default.int(skip),
                ...(limit > 0 && { limit: neo4j_driver_1.default.int(limit) }),
            });
            return rows.map((r) => r.emp);
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Find employees by name error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
    async get(empId) {
        try {
            const rows = await this.neo.run(`MATCH (e:NhanSu {id:$empId})
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (e)-[:LAM_DU_AN]->(p:DuAn)
         WITH e, pb, 
              collect({name:k.ten, level:r.level}) AS skills,
              collect(DISTINCT p) AS projects
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           position: e.chucDanh,
           department: pb.ten,
           skills: skills,
           projects: [proj IN projects | {key: proj.key, name: proj.ten}]
         } AS emp`, { empId });
            if (!rows[0])
                throw new common_1.NotFoundException('Employee not found');
            return rows[0].emp;
        }
        catch (e) {
            if (e instanceof common_1.NotFoundException)
                throw e;
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Get employee error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
    async create(dto) {
        try {
            await this.neo.run(`MATCH (pb:PhongBan {code:$phongBanCode})
         MERGE (e:NhanSu {empId:$empId})
         ON CREATE SET e.ten=$ten, e.chucDanh=$chucDanh
         MERGE (pb)-[:CO_NHAN_SU]->(e)`, dto);
            return { ok: true };
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Create employee error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
    async topSkills(limit = 10) {
        try {
            const rows = await this.neo.run(`MATCH (:NhanSu)-[r:CO_KY_NANG]->(k:KyNang)
         RETURN k.ten AS skill, count(r) AS freq
         ORDER BY freq DESC
         LIMIT $limit`, { limit: neo4j_driver_1.default.int(limit) });
            return rows;
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Top skills error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
    async findByDepartment(deptName, skip = 0, limit = 50) {
        try {
            const rows = await this.neo.run(`MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e:NhanSu)
         WHERE toLower(pb.ten) CONTAINS toLower($deptName) OR toLower(pb.code) CONTAINS toLower($deptName)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         WITH e, pb, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.empId,
           empId: e.empId,
           name: e.ten,
           position: e.chucDanh,
           department: pb.ten,
           skills: skills
         } AS emp
         ORDER BY e.ten
         SKIP $skip LIMIT $limit`, { deptName, skip: neo4j_driver_1.default.int(skip), limit: neo4j_driver_1.default.int(limit) });
            return rows.map((r) => r.emp);
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Find employees by department error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
    async findBySkill(skillName, skip = 0, limit = 50) {
        try {
            const rows = await this.neo.run(`MATCH (e:NhanSu)-[r:CO_KY_NANG]->(k:KyNang)
         WHERE toLower(k.ten) CONTAINS toLower($skillName)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         WITH e, pb, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.empId,
           empId: e.empId,
           name: e.ten,
           position: e.chucDanh,
           department: COALESCE(pb.ten, 'N/A'),
           skills: skills
         } AS emp
         ORDER BY e.ten
         SKIP $skip LIMIT $limit`, { skillName, skip: neo4j_driver_1.default.int(skip), limit: neo4j_driver_1.default.int(limit) });
            return rows.map((r) => r.emp);
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Find employees by skill error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
    async findByPosition(position, skip = 0, limit = 50) {
        try {
            const rows = await this.neo.run(`MATCH (e:NhanSu)
         WHERE toLower(e.chucDanh) CONTAINS toLower($position)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         WITH e, pb, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.empId,
           empId: e.empId,
           name: e.ten,
           position: e.chucDanh,
           department: COALESCE(pb.ten, 'N/A'),
           skills: skills
         } AS emp
         ORDER BY e.ten
         SKIP $skip LIMIT $limit`, { position, skip: neo4j_driver_1.default.int(skip), limit: neo4j_driver_1.default.int(limit) });
            return rows.map((r) => r.emp);
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Find employees by position error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
    async findByProject(projectKey, skip = 0, limit = 50) {
        try {
            const rows = await this.neo.run(`MATCH (e:NhanSu)-[:LAM_DU_AN]->(p:DuAn)
         WHERE toLower(p.key) CONTAINS toLower($projectKey) OR toLower(p.ten) CONTAINS toLower($projectKey)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         WITH e, pb, p, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.empId,
           empId: e.empId,
           name: e.ten,
           position: e.chucDanh,
           department: COALESCE(pb.ten, 'N/A'),
           project: p.ten,
           skills: skills
         } AS emp
         ORDER BY e.ten
         SKIP $skip LIMIT $limit`, { projectKey, skip: neo4j_driver_1.default.int(skip), limit: neo4j_driver_1.default.int(limit) });
            return rows.map((r) => r.emp);
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Find employees by project error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
    async searchByLevel(level, skip = 0, limit = 20) {
        try {
            const rows = await this.neo.run(`MATCH (e:NhanSu)
         WHERE toLower(e.cap_bac_hien_tai) = toLower($level)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         WITH e, pb, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           level: e.cap_bac_hien_tai,
           email: e.email_cong_ty,
           phone: e.so_dien_thoai,
           department: COALESCE(pb.ten, 'N/A'),
           status: e.trang_thai_lam_viec,
           skills: skills
         } AS emp
         ORDER BY e.ho_ten
         SKIP $skip LIMIT $limit`, { level, skip: neo4j_driver_1.default.int(skip), limit: neo4j_driver_1.default.int(limit) });
            return rows.map((r) => r.emp);
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Search employees by level error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
    async searchByEmail(email, skip = 0, limit = 20) {
        try {
            const rows = await this.neo.run(`MATCH (e:NhanSu)
         WHERE toLower(e.email_cong_ty) CONTAINS toLower($email)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         WITH e, pb, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           level: e.cap_bac_hien_tai,
           email: e.email_cong_ty,
           phone: e.so_dien_thoai,
           department: COALESCE(pb.ten, 'N/A'),
           status: e.trang_thai_lam_viec,
           skills: skills
         } AS emp
         ORDER BY e.ho_ten
         SKIP $skip LIMIT $limit`, { email, skip: neo4j_driver_1.default.int(skip), limit: neo4j_driver_1.default.int(limit) });
            return rows.map((r) => r.emp);
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Search employees by email error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
    async searchByPhone(phone, skip = 0, limit = 20) {
        try {
            const rows = await this.neo.run(`MATCH (e:NhanSu)
         WHERE e.so_dien_thoai CONTAINS $phone
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         WITH e, pb, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           level: e.cap_bac_hien_tai,
           email: e.email_cong_ty,
           phone: e.so_dien_thoai,
           department: COALESCE(pb.ten, 'N/A'),
           status: e.trang_thai_lam_viec,
           skills: skills
         } AS emp
         ORDER BY e.ho_ten
         SKIP $skip LIMIT $limit`, { phone, skip: neo4j_driver_1.default.int(skip), limit: neo4j_driver_1.default.int(limit) });
            return rows.map((r) => r.emp);
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Search employees by phone error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
    async searchByBirthDate(birthDate, skip = 0, limit = 20) {
        try {
            const rows = await this.neo.run(`MATCH (e:NhanSu)
         WHERE date(e.ngay_sinh) = date($birthDate)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         WITH e, pb, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           level: e.cap_bac_hien_tai,
           email: e.email_cong_ty,
           phone: e.so_dien_thoai,
           birthDate: toString(e.ngay_sinh),
           department: COALESCE(pb.ten, 'N/A'),
           status: e.trang_thai_lam_viec,
           skills: skills
         } AS emp
         ORDER BY e.ho_ten
         SKIP $skip LIMIT $limit`, { birthDate, skip: neo4j_driver_1.default.int(skip), limit: neo4j_driver_1.default.int(limit) });
            return rows.map((r) => r.emp);
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Search employees by birth date error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
    async searchByJoinDate(joinDate, skip = 0, limit = 20) {
        try {
            const rows = await this.neo.run(`MATCH (e:NhanSu)
         WHERE date(e.ngay_vao_cong_ty) = date($joinDate)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         WITH e, pb, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           level: e.cap_bac_hien_tai,
           email: e.email_cong_ty,
           joinDate: toString(e.ngay_vao_cong_ty),
           department: COALESCE(pb.ten, 'N/A'),
           status: e.trang_thai_lam_viec,
           skills: skills
         } AS emp
         ORDER BY e.ho_ten
         SKIP $skip LIMIT $limit`, { joinDate, skip: neo4j_driver_1.default.int(skip), limit: neo4j_driver_1.default.int(limit) });
            return rows.map((r) => r.emp);
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Search employees by join date error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
    async searchByStatus(status, skip = 0, limit = 20) {
        try {
            const rows = await this.neo.run(`MATCH (e:NhanSu)
         WHERE toLower(e.trang_thai_lam_viec) = toLower($status)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         WITH e, pb, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           level: e.cap_bac_hien_tai,
           email: e.email_cong_ty,
           phone: e.so_dien_thoai,
           department: COALESCE(pb.ten, 'N/A'),
           status: e.trang_thai_lam_viec,
           skills: skills
         } AS emp
         ORDER BY e.ho_ten
         SKIP $skip LIMIT $limit`, { status, skip: neo4j_driver_1.default.int(skip), limit: neo4j_driver_1.default.int(limit) });
            return rows.map((r) => r.emp);
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Search employees by status error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
    async findByCriteria(criteria, skip = 0, limit = 20) {
        try {
            let query = 'MATCH (e:NhanSu)';
            const params = { skip: neo4j_driver_1.default.int(skip), limit: neo4j_driver_1.default.int(limit) };
            const whereClauses = [];
            if (criteria.department) {
                query += ' MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)';
                whereClauses.push('(toLower(pb.ten) CONTAINS toLower($department) OR toLower(pb.code) CONTAINS toLower($department))');
                params.department = criteria.department;
            }
            else {
                query += ' OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)';
            }
            if (criteria.project) {
                query += ' MATCH (e)-[:LAM_DU_AN]->(p:DuAn)';
                whereClauses.push('(toLower(p.ten) CONTAINS toLower($project) OR toLower(p.ma) CONTAINS toLower($project))');
                params.project = criteria.project;
            }
            if (criteria.skill) {
                query += ' MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)';
                whereClauses.push('toLower(k.ten) CONTAINS toLower($skill)');
                params.skill = criteria.skill;
            }
            else {
                query += ' OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)';
            }
            if (criteria.position) {
                whereClauses.push('toLower(e.chucDanh) CONTAINS toLower($position)');
                params.position = criteria.position;
            }
            if (criteria.level) {
                whereClauses.push('toLower(e.cap_bac_hien_tai) CONTAINS toLower($level)');
                params.level = criteria.level;
            }
            if (whereClauses.length > 0) {
                query += ' WHERE ' + whereClauses.join(' AND ');
            }
            query += `
         WITH e, pb, collect(DISTINCT {name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           level: e.cap_bac_hien_tai,
           position: e.chucDanh,
           email: e.email_cong_ty,
           phone: e.so_dien_thoai,
           department: COALESCE(pb.ten, 'N/A'),
           status: e.trang_thai_lam_viec,
           skills: skills
         } AS emp
         ORDER BY e.ho_ten
         SKIP $skip LIMIT $limit`;
            const rows = await this.neo.run(query, params);
            return rows.map((r) => r.emp);
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Find employees by criteria error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
    async count() {
        try {
            const rows = await this.neo.run(`MATCH (e:NhanSu)
         RETURN count(e) AS total`);
            return rows[0]?.total?.toNumber() || 0;
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Count employees error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
    async getById(id) {
        try {
            const rows = await this.neo.run(`MATCH (e:NhanSu {id: $id})
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         OPTIONAL MATCH (e)-[:LAM_DU_AN]->(p:DuAn)
         WITH e, pb, 
              collect(DISTINCT {name:k.ten, level:r.level}) AS skills,
              collect(DISTINCT {id: p.id, name: p.ten, key: p.ma}) AS projects
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           level: e.cap_bac_hien_tai,
           email: e.email_cong_ty,
           phone: e.so_dien_thoai,
           birthDate: toString(e.ngay_sinh),
           joinDate: toString(e.ngay_vao_cong_ty),
           status: e.trang_thai_lam_viec,
           department: COALESCE(pb.ten, 'N/A'),
           skills: skills,
           projects: projects
         } AS emp`, { id });
            if (!rows[0])
                throw new common_1.NotFoundException('Employee not found');
            return rows[0].emp;
        }
        catch (e) {
            if (e instanceof common_1.NotFoundException)
                throw e;
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Get employee by ID error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = EmployeesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], EmployeesService);
//# sourceMappingURL=employees.service.js.map