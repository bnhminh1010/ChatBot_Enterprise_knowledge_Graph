"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ProjectsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../core/neo4j/neo4j.service");
const graph_data_extractor_service_1 = require("../chat/services/graph-data-extractor.service");
const neo4j = __importStar(require("neo4j-driver"));
let ProjectsService = ProjectsService_1 = class ProjectsService {
    neo;
    graphExtractor;
    logger = new common_1.Logger(ProjectsService_1.name);
    constructor(neo, graphExtractor) {
        this.neo = neo;
        this.graphExtractor = graphExtractor;
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
    async searchByName(name, skip = 0, limit = 20) {
        try {
            const result = await this.neo.runRaw(`MATCH (p:DuAn)
         WHERE toLower(p.ten) CONTAINS toLower($name) OR toLower(p.ma) CONTAINS toLower($name)
         OPTIONAL MATCH (p)-[r1:SU_DUNG_CONG_NGHE]->(tech:CongNghe)
         OPTIONAL MATCH (e:NhanSu)-[r2:LAM_DU_AN]->(p)
         OPTIONAL MATCH (pb:PhongBan)-[r3:CO_NHAN_SU]-(e)
         RETURN p, tech, e, pb, r1, r2, r3
         ORDER BY p.ten
         SKIP $skip LIMIT $limit`, { name, skip: neo4j.int(skip), limit: neo4j.int(limit) });
            const records = result.records;
            this.logger.debug(`Got ${records.length} records from Neo4j`);
            let r1Count = 0, r2Count = 0, r3Count = 0;
            records.forEach((record) => {
                if (record.get('r1'))
                    r1Count++;
                if (record.get('r2'))
                    r2Count++;
                if (record.get('r3'))
                    r3Count++;
            });
            this.logger.debug(`Relationships found: r1=${r1Count}, r2=${r2Count}, r3=${r3Count}`);
            const projectsMap = new Map();
            records.forEach((record) => {
                const project = record.get('p');
                if (!project)
                    return;
                const projectId = project.properties.id || project.properties.ma;
                if (!projectsMap.has(projectId)) {
                    projectsMap.set(projectId, {
                        id: project.properties.id,
                        key: project.properties.ma,
                        name: project.properties.ten,
                        client: project.properties.khach_hang,
                        field: project.properties.linh_vuc,
                        type: project.properties.loai,
                        startDate: project.properties.start_date?.toString(),
                        status: project.properties.trang_thai,
                        technologies: [],
                        employees: [],
                    });
                }
                const proj = projectsMap.get(projectId);
                const tech = record.get('tech');
                if (tech && tech.properties.ten) {
                    if (!proj.technologies.includes(tech.properties.ten)) {
                        proj.technologies.push(tech.properties.ten);
                    }
                }
                const emp = record.get('e');
                if (emp) {
                    const empId = emp.properties.id;
                    if (!proj.employees.find((e) => e.id === empId)) {
                        proj.employees.push({
                            id: empId,
                            name: emp.properties.ho_ten,
                        });
                    }
                }
            });
            const projects = Array.from(projectsMap.values());
            let graphData = null;
            if (this.graphExtractor.shouldGenerateGraph(records)) {
                graphData = this.graphExtractor.extractGraphData(records);
                this.logger.debug(`Extracted graph: ${graphData.nodes.length} nodes, ${graphData.links.length} links`);
            }
            return { projects, graphData };
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Database connection error';
            this.logger.error('Search projects by name error:', errorMessage);
            throw new common_1.ServiceUnavailableException(errorMessage);
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
exports.ProjectsService = ProjectsService = ProjectsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService,
        graph_data_extractor_service_1.GraphDataExtractor])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map