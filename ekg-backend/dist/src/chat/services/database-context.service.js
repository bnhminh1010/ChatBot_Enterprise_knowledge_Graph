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
var DatabaseContextService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseContextService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../../core/neo4j/neo4j.service");
let DatabaseContextService = DatabaseContextService_1 = class DatabaseContextService {
    neo4j;
    logger = new common_1.Logger(DatabaseContextService_1.name);
    schemaCache = null;
    statsCache = null;
    contextStringCache = null;
    SCHEMA_TTL_MS = 24 * 60 * 60 * 1000;
    STATS_TTL_MS = 5 * 60 * 1000;
    schemaLastLoaded = null;
    statsLastLoaded = null;
    nodeTypeMap = {
        NhanSu: 'Nhân viên',
        PhongBan: 'Phòng ban',
        DuAn: 'Dự án',
        KyNang: 'Kỹ năng',
        TaiLieu: 'Tài liệu',
        ChucDanh: 'Chức danh',
        CongNghe: 'Công nghệ',
        ViTri: 'Vị trí',
        CongTy: 'Công ty',
    };
    relationshipMap = {
        LAM_VIEC_TAI: 'làm việc tại',
        CO_KY_NANG: 'có kỹ năng',
        THAM_GIA: 'tham gia dự án',
        QUAN_LY: 'quản lý',
        DINH_KEM_TAI_LIEU: 'đính kèm tài liệu',
        GIU_CHUC_VU: 'giữ chức vụ',
        SU_DUNG_CONG_NGHE: 'sử dụng công nghệ',
    };
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async onModuleInit() {
        try {
            this.logger.log('Loading database context for agent...');
            await this.loadFullContext();
            this.logger.log('Database context loaded successfully');
        }
        catch (error) {
            this.logger.warn(`Failed to load initial context: ${error}`);
        }
    }
    async loadFullContext() {
        await Promise.all([
            this.loadSchema(),
            this.loadStatistics(),
        ]);
        this.buildContextString();
    }
    async loadSchema() {
        try {
            const nodeTypes = [];
            for (const [label, displayName] of Object.entries(this.nodeTypeMap)) {
                try {
                    const countResult = await this.neo4j.run(`MATCH (n:${label}) RETURN count(n) as count`);
                    const count = countResult[0]?.count?.toNumber?.() || 0;
                    if (count === 0)
                        continue;
                    const sampleResult = await this.neo4j.run(`MATCH (n:${label}) 
             RETURN n 
             LIMIT 3`);
                    const samples = sampleResult.map((r) => {
                        const node = r.n?.properties || {};
                        return this.sanitizeNodeData(label, node);
                    });
                    const properties = samples.length > 0
                        ? Object.keys(samples[0])
                        : [];
                    nodeTypes.push({
                        label,
                        displayNameVi: displayName,
                        count,
                        properties,
                        sampleData: samples,
                    });
                }
                catch (error) {
                    this.logger.warn(`Failed to load schema for ${label}: ${error}`);
                }
            }
            const relationships = [];
            for (const [relType, description] of Object.entries(this.relationshipMap)) {
                try {
                    const relResult = await this.neo4j.run(`MATCH (a)-[r:${relType}]->(b)
             RETURN labels(a)[0] as fromLabel, labels(b)[0] as toLabel, count(r) as count
             LIMIT 1`);
                    if (relResult.length > 0) {
                        const row = relResult[0];
                        relationships.push({
                            type: relType,
                            fromLabel: row.fromLabel || 'Unknown',
                            toLabel: row.toLabel || 'Unknown',
                            descriptionVi: description,
                            count: row.count?.toNumber?.() || 0,
                        });
                    }
                }
                catch (error) {
                }
            }
            this.schemaCache = {
                nodeTypes,
                relationships,
                lastUpdated: new Date(),
            };
            this.schemaLastLoaded = new Date();
            this.logger.debug(`Schema loaded: ${nodeTypes.length} node types, ${relationships.length} relationships`);
        }
        catch (error) {
            this.logger.error(`Failed to load schema: ${error}`);
        }
    }
    async loadStatistics() {
        try {
            const empByDeptResult = await this.neo4j.run(`MATCH (n:NhanSu)-[:LAM_VIEC_TAI]->(p:PhongBan)
         RETURN p.ten as dept, count(n) as count
         ORDER BY count DESC`);
            const byDepartment = {};
            let totalEmployees = 0;
            for (const row of empByDeptResult) {
                const r = row;
                byDepartment[r.dept] = r.count?.toNumber?.() || 0;
                totalEmployees += byDepartment[r.dept];
            }
            const deptResult = await this.neo4j.run(`MATCH (p:PhongBan) RETURN p.ten as name ORDER BY name`);
            const deptNames = deptResult.map((r) => r.name).filter(Boolean);
            const projectResult = await this.neo4j.run(`MATCH (d:DuAn)
         RETURN d.trang_thai as status, count(d) as count`);
            const byStatus = {};
            let totalProjects = 0;
            for (const row of projectResult) {
                const r = row;
                const status = r.status || 'Unknown';
                byStatus[status] = r.count?.toNumber?.() || 0;
                totalProjects += byStatus[status];
            }
            const skillResult = await this.neo4j.run(`MATCH (s:KyNang)<-[:CO_KY_NANG]-(n:NhanSu)
         RETURN s.ten as skill, count(n) as count
         ORDER BY count DESC
         LIMIT 10`);
            const topSkills = skillResult.map((r) => r.skill).filter(Boolean);
            const skillCountResult = await this.neo4j.run(`MATCH (s:KyNang) RETURN count(s) as count`);
            const totalSkills = skillCountResult[0]?.count?.toNumber?.() || 0;
            const docCountResult = await this.neo4j.run(`MATCH (t:TaiLieu) RETURN count(t) as count`);
            const totalDocs = docCountResult[0]?.count?.toNumber?.() || 0;
            this.statsCache = {
                employees: { total: totalEmployees, byDepartment },
                departments: { total: deptNames.length, names: deptNames },
                projects: { total: totalProjects, byStatus },
                skills: { total: totalSkills, topSkills },
                documents: { total: totalDocs },
                lastUpdated: new Date(),
            };
            this.statsLastLoaded = new Date();
            this.logger.debug(`Stats loaded: ${totalEmployees} employees, ${deptNames.length} departments`);
        }
        catch (error) {
            this.logger.error(`Failed to load statistics: ${error}`);
        }
    }
    sanitizeNodeData(label, node) {
        const importantFields = {
            NhanSu: ['id', 'ten', 'email', 'so_dien_thoai'],
            PhongBan: ['id', 'ten', 'ma'],
            DuAn: ['id', 'ten', 'trang_thai', 'loai'],
            KyNang: ['id', 'ten', 'nhom'],
            TaiLieu: ['id', 'ten', 'loai'],
            ChucDanh: ['id', 'ten', 'cap_bac'],
            CongNghe: ['id', 'ten', 'loai'],
        };
        const fields = importantFields[label] || ['id', 'ten'];
        const sanitized = {};
        for (const field of fields) {
            if (node[field] !== undefined) {
                sanitized[field] = node[field];
            }
        }
        return sanitized;
    }
    buildContextString() {
        if (!this.schemaCache || !this.statsCache) {
            this.contextStringCache = '';
            return;
        }
        const lines = [];
        lines.push('📊 DATABASE: Neo4j Knowledge Graph');
        lines.push('NODE TYPES: ' + this.schemaCache.nodeTypes
            .map(n => `${n.label}(${n.count})`)
            .join(', '));
        if (this.statsCache.departments.names.length > 0) {
            lines.push('PHÒNG BAN: ' + this.statsCache.departments.names.join(', '));
        }
        if (this.statsCache.skills.topSkills.length > 0) {
            lines.push('TOP KỸ NĂNG: ' + this.statsCache.skills.topSkills.slice(0, 5).join(', '));
        }
        this.contextStringCache = lines.join('\n');
        this.logger.debug(`Context string built: ${this.contextStringCache.length} chars`);
    }
    async getAgentContext() {
        const now = new Date();
        if (!this.statsLastLoaded ||
            (now.getTime() - this.statsLastLoaded.getTime()) > this.STATS_TTL_MS) {
            await this.loadStatistics();
            this.buildContextString();
        }
        return this.contextStringCache || '';
    }
    getSchema() {
        return this.schemaCache;
    }
    getStatistics() {
        return this.statsCache;
    }
    async forceRefresh() {
        this.schemaCache = null;
        this.statsCache = null;
        this.contextStringCache = null;
        await this.loadFullContext();
    }
};
exports.DatabaseContextService = DatabaseContextService;
exports.DatabaseContextService = DatabaseContextService = DatabaseContextService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], DatabaseContextService);
//# sourceMappingURL=database-context.service.js.map