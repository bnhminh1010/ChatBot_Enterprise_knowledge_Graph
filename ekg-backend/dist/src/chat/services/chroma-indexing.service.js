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
var ChromaIndexingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChromaIndexingService = void 0;
const common_1 = require("@nestjs/common");
const chroma_db_service_1 = require("../../ai/chroma-db.service");
const employees_service_1 = require("../../employees/employees.service");
const departments_service_1 = require("../../departments/departments.service");
const projects_service_1 = require("../../projects/projects.service");
const skills_service_1 = require("../../skills/skills.service");
const documents_service_1 = require("../../documents/documents.service");
let ChromaIndexingService = ChromaIndexingService_1 = class ChromaIndexingService {
    chromaDBService;
    employeesService;
    departmentsService;
    projectsService;
    skillsService;
    documentsService;
    logger = new common_1.Logger(ChromaIndexingService_1.name);
    constructor(chromaDBService, employeesService, departmentsService, projectsService, skillsService, documentsService) {
        this.chromaDBService = chromaDBService;
        this.employeesService = employeesService;
        this.departmentsService = departmentsService;
        this.projectsService = projectsService;
        this.skillsService = skillsService;
        this.documentsService = documentsService;
    }
    async indexAll() {
        this.logger.log('🔄 Starting ChromaDB indexing...');
        const details = {
            indexed: {},
            errors: [],
        };
        try {
            this.logger.log('📝 Indexing employees...');
            const employees = await this.employeesService.list(0, 1000);
            if (employees.length > 0) {
                const docs = employees.map((emp) => ({
                    id: emp.id || emp.empId,
                    content: `${emp.name || 'Unknown'} - ${emp.position || ''} (${emp.level || 'N/A'}). Department: ${emp.department || 'N/A'}. Email: ${emp.email || ''}, Phone: ${emp.phone || ''}`,
                    metadata: {
                        type: 'employee',
                        id: emp.id || emp.empId,
                        name: emp.name || '',
                        position: emp.position || '',
                        level: emp.level || '',
                        department: emp.department || '',
                    },
                }));
                await this.chromaDBService.addDocuments('employees', docs);
                details.indexed['employees'] = docs.length;
                this.logger.log(`✅ Indexed ${docs.length} employees`);
            }
        }
        catch (error) {
            this.logger.error(`❌ Failed to index employees: ${error.message}`);
            details.errors.push({ entity: 'employees', error: error.message });
        }
        try {
            this.logger.log('📝 Indexing departments...');
            const departments = await this.departmentsService.list();
            if (departments.length > 0) {
                const docs = departments.map((dept) => ({
                    id: dept.id || dept.code,
                    content: `${dept.name || 'Unknown'} - Code: ${dept.code || 'N/A'}. Description: ${dept.description || 'No description'}`,
                    metadata: {
                        type: 'department',
                        id: dept.id || dept.code,
                        name: dept.name || '',
                        code: dept.code || '',
                        description: dept.description || '',
                    },
                }));
                await this.chromaDBService.addDocuments('departments', docs);
                details.indexed['departments'] = docs.length;
                this.logger.log(`✅ Indexed ${docs.length} departments`);
            }
        }
        catch (error) {
            this.logger.error(`❌ Failed to index departments: ${error.message}`);
            details.errors.push({ entity: 'departments', error: error.message });
        }
        try {
            this.logger.log('📝 Indexing projects...');
            const projects = await this.projectsService.list();
            if (projects.length > 0) {
                const docs = projects.map((proj) => ({
                    id: proj.id || proj.key,
                    content: `${proj.name || 'Unknown'} - Key: ${proj.key || 'N/A'}. Status: ${proj.status || 'Active'}. Technologies: ${(proj.technologies || []).join(', ')}`,
                    metadata: {
                        type: 'project',
                        id: proj.id || proj.key,
                        name: proj.name || '',
                        key: proj.key || '',
                        status: proj.status || '',
                        technologies: proj.technologies || [],
                    },
                }));
                await this.chromaDBService.addDocuments('projects', docs);
                details.indexed['projects'] = docs.length;
                this.logger.log(`✅ Indexed ${docs.length} projects`);
            }
        }
        catch (error) {
            this.logger.error(`❌ Failed to index projects: ${error.message}`);
            details.errors.push({ entity: 'projects', error: error.message });
        }
        try {
            this.logger.log('📝 Indexing skills...');
            const skills = await this.skillsService.list();
            if (skills.length > 0) {
                const docs = skills.map((skill) => ({
                    id: skill.id || skill.name,
                    content: `${skill.name || 'Unknown'} - Category: ${skill.category || 'General'}`,
                    metadata: {
                        type: 'skill',
                        id: skill.id || skill.name,
                        name: skill.name || '',
                        category: skill.category || '',
                    },
                }));
                await this.chromaDBService.addDocuments('skills', docs);
                details.indexed['skills'] = docs.length;
                this.logger.log(`✅ Indexed ${docs.length} skills`);
            }
        }
        catch (error) {
            this.logger.error(`❌ Failed to index skills: ${error.message}`);
            details.errors.push({ entity: 'skills', error: error.message });
        }
        try {
            this.logger.log('📝 Indexing documents...');
            const projects = await this.projectsService.list();
            let allDocuments = [];
            for (const project of projects) {
                try {
                    const result = await this.documentsService.getProjectDocuments(project.id || project.key);
                    const projectDocs = result?.documents || [];
                    if (projectDocs &&
                        Array.isArray(projectDocs) &&
                        projectDocs.length > 0) {
                        const mappedDocs = projectDocs.map((doc) => ({
                            ...doc,
                            projectName: project.name,
                            projectKey: project.key || project.id,
                        }));
                        allDocuments = allDocuments.concat(mappedDocs);
                    }
                }
                catch (err) {
                    this.logger.warn(`Could not get documents for project ${project.name}: ${err.message}`);
                }
            }
            if (allDocuments.length > 0) {
                const docs = allDocuments.map((doc) => ({
                    id: doc.id,
                    content: `${doc.name || doc.ten || 'Untitled'} - ${doc.description || doc.mo_ta || 'No description'}. File type: ${doc.type || doc.loai_file || 'N/A'}. Project: ${doc.projectName || 'N/A'}`,
                    metadata: {
                        type: 'document',
                        id: doc.id,
                        name: doc.name || doc.ten || '',
                        duong_dan: doc.path || doc.duong_dan || '',
                        loai_file: doc.type || doc.loai_file || '',
                        mo_ta: doc.description || doc.mo_ta || '',
                        projectId: doc.projectId || doc.projectKey || '',
                        projectName: doc.projectName || '',
                    },
                }));
                await this.chromaDBService.addDocuments('documents', docs);
                details.indexed['documents'] = docs.length;
                this.logger.log(`✅ Indexed ${docs.length} documents`);
            }
        }
        catch (error) {
            this.logger.error(`❌ Failed to index documents: ${error.message}`);
            details.errors.push({ entity: 'documents', error: error.message });
        }
        const totalIndexed = Object.values(details.indexed).reduce((sum, count) => sum + count, 0);
        this.logger.log(`✅ Indexing completed: ${totalIndexed} total documents indexed`);
        return {
            success: totalIndexed > 0,
            message: totalIndexed > 0
                ? `Successfully indexed ${totalIndexed} documents`
                : 'No documents indexed',
            details,
        };
    }
};
exports.ChromaIndexingService = ChromaIndexingService;
exports.ChromaIndexingService = ChromaIndexingService = ChromaIndexingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [chroma_db_service_1.ChromaDBService,
        employees_service_1.EmployeesService,
        departments_service_1.DepartmentsService,
        projects_service_1.ProjectsService,
        skills_service_1.SkillsService,
        documents_service_1.DocumentsService])
], ChromaIndexingService);
//# sourceMappingURL=chroma-indexing.service.js.map