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
var RecommendationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../../core/neo4j/neo4j.service");
const neo4j = __importStar(require("neo4j-driver"));
let RecommendationService = RecommendationService_1 = class RecommendationService {
    neo4jService;
    logger = new common_1.Logger(RecommendationService_1.name);
    constructor(neo4jService) {
        this.neo4jService = neo4jService;
    }
    async recommendEmployeesForProject(projectName, requiredSkills, limit = 5) {
        this.logger.log(`🎯 Recommending employees for project: ${projectName}`);
        try {
            const projectResult = await this.neo4jService.run(`MATCH (p:DuAn)
         WHERE toLower(p.ten) CONTAINS toLower($projectName) OR toLower(p.ma) CONTAINS toLower($projectName)
         OPTIONAL MATCH (p)-[:SU_DUNG_CONG_NGHE]->(tech:CongNghe)
         RETURN p, collect(DISTINCT tech.ten) AS technologies
         LIMIT 1`, { projectName });
            if (projectResult.length === 0) {
                return {
                    recommendations: [],
                    projectInfo: null,
                };
            }
            const project = projectResult[0].p;
            const projectTechs = projectResult[0].technologies.filter(Boolean);
            const targetSkills = [
                ...new Set([...projectTechs, ...(requiredSkills || [])]),
            ];
            this.logger.debug(`Target skills for matching: ${targetSkills.join(', ')}`);
            const employeesResult = await this.neo4jService.run(`MATCH (e:NhanSu)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         OPTIONAL MATCH (e)-[:LAM_DU_AN]->(activeProject:DuAn)
         WHERE activeProject.trang_thai IN ['In Progress', 'Active', 'Đang tiến hành'] OR activeProject IS NULL
         WITH e, pb, 
              collect(DISTINCT k.ten) AS skills,
              count(DISTINCT activeProject) AS projectCount
         WHERE size([s IN $targetSkills WHERE s IN skills]) > 0 OR size($targetSkills) = 0
         RETURN {
           id: e.id,
           name: e.ho_ten,
           position: e.chucDanh,
           level: e.cap_bac_hien_tai,
           department: COALESCE(pb.ten, 'N/A'),
           skills: skills,
           projectCount: projectCount
         } AS employee
         ORDER BY projectCount ASC
         LIMIT $limit`, {
                targetSkills,
                limit: neo4j.int(limit * 2),
            });
            const recommendations = employeesResult
                .map((row) => {
                const emp = row.employee;
                const empSkills = emp.skills.filter(Boolean);
                const projectCount = typeof emp.projectCount === 'bigint'
                    ? Number(emp.projectCount)
                    : (emp.projectCount?.toNumber?.() ??
                        Number(emp.projectCount) ??
                        0);
                const matchingSkills = targetSkills.filter((skill) => empSkills.some((es) => es && skill && es.toLowerCase().includes(skill.toLowerCase())));
                const skillMatchScore = targetSkills.length > 0
                    ? (matchingSkills.length / targetSkills.length) * 60
                    : 30;
                const workloadScore = Math.max(0, 30 - projectCount * 10);
                const levelScore = this.getLevelScore(emp.level);
                const totalScore = Math.min(100, Math.round(skillMatchScore + workloadScore + levelScore));
                const workload = projectCount <= 1 ? 'low' : projectCount <= 3 ? 'medium' : 'high';
                const reason = this.generateRecommendationReason(matchingSkills, projectCount, emp.level);
                return {
                    employee: {
                        id: emp.id,
                        name: emp.name,
                        position: emp.position,
                        department: emp.department,
                        level: emp.level,
                    },
                    matchScore: totalScore,
                    matchingSkills,
                    currentWorkload: workload,
                    projectCount: projectCount,
                    reason,
                };
            })
                .sort((a, b) => b.matchScore - a.matchScore)
                .slice(0, limit);
            return {
                recommendations,
                projectInfo: {
                    id: project.id,
                    name: project.ten,
                    technologies: projectTechs,
                },
            };
        }
        catch (error) {
            this.logger.error(`Failed to recommend employees: ${error}`);
            throw error;
        }
    }
    async recommendTrainingForEmployee(employeeId, employeeName) {
        this.logger.log(`📚 Recommending training for: ${employeeId || employeeName}`);
        try {
            const employeeResult = await this.neo4jService.run(`MATCH (e:NhanSu)
         WHERE ($employeeId IS NOT NULL AND e.id = $employeeId) 
            OR ($employeeName IS NOT NULL AND toLower(e.ho_ten) CONTAINS toLower($employeeName))
         OPTIONAL MATCH (e)-[:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         RETURN e, pb.ten AS department, collect(DISTINCT k.ten) AS skills
         LIMIT 1`, { employeeId: employeeId || null, employeeName: employeeName || null });
            if (employeeResult.length === 0) {
                return { suggestions: [], employee: null };
            }
            const emp = employeeResult[0].e;
            const currentSkills = employeeResult[0].skills.filter(Boolean);
            const department = employeeResult[0].department;
            const trendingResult = await this.neo4jService.run(`MATCH (p:DuAn)-[:SU_DUNG_CONG_NGHE]->(tech:CongNghe)
         WHERE p.trang_thai IN ['In Progress', 'Active', 'Đang tiến hành']
         RETURN tech.ten AS skill, count(DISTINCT p) AS projectCount
         ORDER BY projectCount DESC
         LIMIT 10`);
            let deptSkillsResult = [];
            if (department && emp.id) {
                deptSkillsResult = await this.neo4jService.run(`MATCH (pb:PhongBan {ten: $department})-[:CO_NHAN_SU]-(colleague:NhanSu)
           WHERE colleague.id <> $empId
           MATCH (colleague)-[:CO_KY_NANG]->(k:KyNang)
           RETURN k.ten AS skill, count(DISTINCT colleague) AS colleagueCount
           ORDER BY colleagueCount DESC
           LIMIT 10`, { department: department, empId: emp.id });
            }
            const suggestions = [];
            for (const row of trendingResult) {
                const skill = row.skill;
                if (skill &&
                    !currentSkills.some((s) => s?.toLowerCase() === skill?.toLowerCase())) {
                    suggestions.push({
                        skill,
                        priority: row.projectCount > 3 ? 'high' : 'medium',
                        reason: `Được sử dụng trong ${row.projectCount} dự án đang hoạt động`,
                        relatedProjects: [],
                    });
                }
            }
            for (const row of deptSkillsResult) {
                const skill = row.skill;
                if (skill &&
                    !currentSkills.some((s) => s?.toLowerCase() === skill?.toLowerCase()) &&
                    !suggestions.some((s) => s.skill?.toLowerCase() === skill?.toLowerCase())) {
                    suggestions.push({
                        skill,
                        priority: row.colleagueCount > 2 ? 'medium' : 'low',
                        reason: `${row.colleagueCount} đồng nghiệp trong phòng ban có kỹ năng này`,
                        relatedProjects: [],
                    });
                }
            }
            return {
                suggestions: suggestions.slice(0, 5),
                employee: {
                    id: emp.id,
                    name: emp.ho_ten,
                    department,
                    currentSkills,
                },
            };
        }
        catch (error) {
            this.logger.error(`Failed to recommend training: ${error}`);
            throw error;
        }
    }
    async recommendProjectsForEmployee(employeeId, employeeName, limit = 3) {
        this.logger.log(`🚀 Recommending projects for: ${employeeId || employeeName}`);
        try {
            const employeeResult = await this.neo4jService.run(`MATCH (e:NhanSu)
         WHERE ($employeeId IS NOT NULL AND e.id = $employeeId) 
            OR ($employeeName IS NOT NULL AND toLower(e.ho_ten) CONTAINS toLower($employeeName))
         OPTIONAL MATCH (e)-[:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (e)-[:LAM_DU_AN]->(currentProject:DuAn)
         RETURN e, 
                collect(DISTINCT k.ten) AS skills,
                collect(DISTINCT currentProject.id) AS currentProjectIds
         LIMIT 1`, { employeeId: employeeId || null, employeeName: employeeName || null });
            if (employeeResult.length === 0) {
                return { recommendations: [], employee: null };
            }
            const emp = employeeResult[0].e;
            const empSkills = employeeResult[0].skills.filter(Boolean);
            const currentProjectIds = employeeResult[0].currentProjectIds.filter(Boolean);
            const projectsResult = await this.neo4jService.run(`MATCH (p:DuAn)
         WHERE p.trang_thai IN ['In Progress', 'Active', 'Đang tiến hành', 'Planning']
           AND NOT p.id IN $currentProjectIds
         OPTIONAL MATCH (p)-[:SU_DUNG_CONG_NGHE]->(tech:CongNghe)
         RETURN p, collect(DISTINCT tech.ten) AS technologies
         LIMIT 20`, { currentProjectIds });
            const recommendations = projectsResult
                .map((row) => {
                const project = row.p;
                const projectTechs = row.technologies.filter(Boolean);
                const matchingSkills = empSkills.filter((skill) => projectTechs.some((tech) => tech &&
                    skill &&
                    tech.toLowerCase().includes(skill.toLowerCase())));
                const matchScore = projectTechs.length > 0
                    ? Math.round((matchingSkills.length / projectTechs.length) * 100)
                    : 50;
                return {
                    project: {
                        id: project.id,
                        name: project.ten,
                        client: project.khach_hang || 'N/A',
                        status: project.trang_thai,
                    },
                    matchScore,
                    matchingSkills,
                    reason: matchingSkills.length > 0
                        ? `Có ${matchingSkills.length} kỹ năng phù hợp: ${matchingSkills.join(', ')}`
                        : 'Dự án mới có thể phát triển thêm kỹ năng',
                };
            })
                .filter((r) => r.matchScore > 0)
                .sort((a, b) => b.matchScore - a.matchScore)
                .slice(0, limit);
            return {
                recommendations,
                employee: {
                    id: emp.id,
                    name: emp.ho_ten,
                    skills: empSkills,
                },
            };
        }
        catch (error) {
            this.logger.error(`Failed to recommend projects: ${error}`);
            throw error;
        }
    }
    getLevelScore(level) {
        const levelMap = {
            senior: 10,
            lead: 10,
            principal: 10,
            mid: 7,
            junior: 5,
            intern: 3,
        };
        const lowerLevel = level?.toLowerCase() || '';
        for (const [key, score] of Object.entries(levelMap)) {
            if (lowerLevel.includes(key))
                return score;
        }
        return 5;
    }
    generateRecommendationReason(matchingSkills, projectCount, level) {
        const parts = [];
        if (matchingSkills.length > 0) {
            parts.push(`Có ${matchingSkills.length} kỹ năng phù hợp (${matchingSkills.slice(0, 3).join(', ')})`);
        }
        if (projectCount <= 1) {
            parts.push('Workload thấp, sẵn sàng nhận dự án mới');
        }
        else if (projectCount <= 3) {
            parts.push('Workload vừa phải');
        }
        if (level) {
            parts.push(`Level: ${level}`);
        }
        return parts.join('. ') || 'Ứng viên tiềm năng';
    }
    async findEmployeesNeedingTraining(limit = 10) {
        this.logger.log(`📚 Finding all employees needing training...`);
        try {
            const trendingResult = await this.neo4jService.run(`MATCH (p:DuAn)-[:SU_DUNG_CONG_NGHE]->(tech:CongNghe)
         WHERE p.trang_thai IN ['In Progress', 'Active', 'Đang tiến hành']
         RETURN tech.ten AS skill, count(DISTINCT p) AS projectCount
         ORDER BY projectCount DESC
         LIMIT 10`);
            const trendingSkills = trendingResult
                .map((r) => r.skill)
                .filter(Boolean);
            if (trendingSkills.length === 0) {
                return { employees: [], trendingSkills: [] };
            }
            const employeesResult = await this.neo4jService.run(`MATCH (e:NhanSu)
         OPTIONAL MATCH (e)-[:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         RETURN e,
                pb.ten AS department,
                collect(DISTINCT k.ten) AS skills`);
            const employeesWithGaps = employeesResult
                .map((row) => {
                const emp = row.e;
                const currentSkills = (row.skills || []).filter(Boolean);
                const department = row.department;
                const missingSkills = trendingSkills.filter((trendingSkill) => !currentSkills.some((s) => s &&
                    trendingSkill &&
                    s.toLowerCase().includes(trendingSkill.toLowerCase())));
                const skillGapCount = missingSkills.length;
                const priority = skillGapCount >= 5 ? 'high' : skillGapCount >= 3 ? 'medium' : 'low';
                const reason = skillGapCount > 0
                    ? `Thiếu ${skillGapCount} kỹ năng trending: ${missingSkills.slice(0, 3).join(', ')}${missingSkills.length > 3 ? '...' : ''}`
                    : 'Đã có đầy đủ kỹ năng trending';
                return {
                    employee: {
                        id: emp.id,
                        name: emp.ho_ten,
                        position: emp.chucDanh || 'N/A',
                        department: department || 'N/A',
                    },
                    missingSkills,
                    skillGapCount,
                    priority,
                    reason,
                };
            })
                .filter((e) => e.skillGapCount > 0)
                .sort((a, b) => b.skillGapCount - a.skillGapCount)
                .slice(0, limit);
            return {
                employees: employeesWithGaps,
                trendingSkills,
            };
        }
        catch (error) {
            this.logger.error(`Failed to find employees needing training: ${error}`);
            throw error;
        }
    }
};
exports.RecommendationService = RecommendationService;
exports.RecommendationService = RecommendationService = RecommendationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], RecommendationService);
//# sourceMappingURL=recommendation.service.js.map