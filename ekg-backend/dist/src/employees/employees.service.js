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
           id: e.empId,
           empId: e.empId,
           name: e.ten,
           position: e.chucDanh,
           skills: skills
         } AS emp
         ORDER BY e.ten
         SKIP $skip LIMIT $limit`, { skip: neo4j_driver_1.default.int(skip), limit: neo4j_driver_1.default.int(limit) });
            return rows.map(r => r.emp);
        }
        catch (e) {
            if (e instanceof common_1.NotFoundException)
                throw e;
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Employees list error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
        }
    }
    async get(empId) {
        try {
            const rows = await this.neo.run(`MATCH (e:NhanSu {empId:$empId})
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (e)-[:LAM_DU_AN]->(p:DuAn)
         WITH e, pb, 
              collect({name:k.ten, level:r.level}) AS skills,
              collect(DISTINCT p) AS projects
         RETURN {
           id: e.empId,
           empId: e.empId,
           name: e.ten,
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
            return rows.map(r => r.emp);
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
            return rows.map(r => r.emp);
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
            return rows.map(r => r.emp);
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
            return rows.map(r => r.emp);
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Find employees by project error:', errorMessage);
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