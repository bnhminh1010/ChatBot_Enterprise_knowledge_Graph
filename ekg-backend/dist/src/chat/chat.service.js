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
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const query_classifier_service_1 = require("../ai/query-classifier.service");
const ollama_service_1 = require("../ai/ollama.service");
const chroma_db_service_1 = require("../ai/chroma-db.service");
const gemini_service_1 = require("../ai/gemini.service");
const employees_service_1 = require("../employees/employees.service");
const skills_service_1 = require("../skills/skills.service");
const departments_service_1 = require("../departments/departments.service");
const projects_service_1 = require("../projects/projects.service");
const search_service_1 = require("../search/search.service");
let ChatService = ChatService_1 = class ChatService {
    queryClassifier;
    ollamaService;
    chromaDBService;
    geminiService;
    employeesService;
    skillsService;
    departmentsService;
    projectsService;
    searchService;
    logger = new common_1.Logger(ChatService_1.name);
    constructor(queryClassifier, ollamaService, chromaDBService, geminiService, employeesService, skillsService, departmentsService, projectsService, searchService) {
        this.queryClassifier = queryClassifier;
        this.ollamaService = ollamaService;
        this.chromaDBService = chromaDBService;
        this.geminiService = geminiService;
        this.employeesService = employeesService;
        this.skillsService = skillsService;
        this.departmentsService = departmentsService;
        this.projectsService = projectsService;
        this.searchService = searchService;
    }
    async processQuery(message) {
        const startTime = Date.now();
        try {
            const classified = this.queryClassifier.classifyQuery(message);
            this.logger.debug(`Query classified: ${classified.type} (${classified.level})`);
            let response = '';
            switch (classified.level) {
                case 'simple':
                    response = await this.handleSimpleQuery(classified.type, classified.value);
                    break;
                case 'medium':
                    if (classified.filters && Object.keys(classified.filters).length > 0) {
                        response = await this.handleFilteredQuery(classified.type, classified.filters, message);
                    }
                    else {
                        response = await this.handleMediumQuery(classified.type, classified.value, message);
                    }
                    break;
                case 'complex':
                    response = await this.handleComplexQuery(classified.type, classified.value, message);
                    break;
                default:
                    response = 'Xin lỗi, tôi không hiểu yêu cầu của bạn. Hãy thử các lệnh như "Danh sách nhân viên", "Tìm [tên]", etc.';
            }
            const processingTime = Date.now() - startTime;
            return {
                response,
                queryType: classified.type,
                queryLevel: classified.level,
                processingTime,
            };
        }
        catch (error) {
            this.logger.error(`Error processing query: ${error}`);
            const processingTime = Date.now() - startTime;
            let errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (errorMessage.includes('Neo4j') || errorMessage.includes('database') || errorMessage.includes('connection')) {
                errorMessage = `Lỗi kết nối database: ${errorMessage}\n\n` +
                    `💡 Hướng dẫn khắc phục:\n` +
                    `1. Kiểm tra Neo4j có đang chạy: docker ps | grep neo4j\n` +
                    `2. Khởi động Neo4j: cd ekg-backend && docker-compose up -d\n` +
                    `3. Kiểm tra file .env có đầy đủ: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD\n` +
                    `4. Truy cập Neo4j Browser: http://localhost:7474 để kiểm tra`;
            }
            return {
                response: `Có lỗi xảy ra: ${errorMessage}`,
                queryType: 'error',
                queryLevel: 'simple',
                processingTime,
            };
        }
    }
    async handleSimpleQuery(type, value) {
        try {
            switch (type) {
                case 'list-employees': {
                    const employees = await this.employeesService.list();
                    if (employees.length === 0) {
                        return 'Không có nhân viên nào trong hệ thống.';
                    }
                    const list = employees
                        .slice(0, 10)
                        .map((emp) => `• ${emp.name} - ${emp.position || 'Chưa xác định'}`)
                        .join('\n');
                    return `Danh sách nhân viên (${employees.length}):\n${list}${employees.length > 10 ? '\n... và ' + (employees.length - 10) + ' người khác' : ''}`;
                }
                case 'list-departments': {
                    const departments = await this.departmentsService.list();
                    if (departments.length === 0) {
                        return 'Không có phòng ban nào trong hệ thống.';
                    }
                    const list = departments
                        .slice(0, 10)
                        .map((dept) => `• ${dept.name}`)
                        .join('\n');
                    return `Danh sách phòng ban (${departments.length}):\n${list}${departments.length > 10 ? '\n... và ' + (departments.length - 10) + ' phòng khác' : ''}`;
                }
                case 'list-skills': {
                    const skills = await this.skillsService.list();
                    if (skills.length === 0) {
                        return 'Không có kỹ năng nào trong hệ thống.';
                    }
                    const list = skills
                        .slice(0, 10)
                        .map((skill) => `• ${skill.name}`)
                        .join('\n');
                    return `Danh sách kỹ năng (${skills.length}):\n${list}${skills.length > 10 ? '\n... và ' + (skills.length - 10) + ' kỹ năng khác' : ''}`;
                }
                case 'list-projects': {
                    const projects = await this.projectsService.list();
                    if (projects.length === 0) {
                        return 'Không có dự án nào trong hệ thống.';
                    }
                    const list = projects
                        .slice(0, 10)
                        .map((proj) => `• ${proj.name} - ${proj.status || 'Chưa xác định'}`)
                        .join('\n');
                    return `Danh sách dự án (${projects.length}):\n${list}${projects.length > 10 ? '\n... và ' + (projects.length - 10) + ' dự án khác' : ''}`;
                }
                case 'search-global': {
                    const results = await this.searchService.search({ query: value || '' });
                    if (results.length === 0) {
                        return `Không tìm thấy kết quả cho "${value}".`;
                    }
                    const list = results
                        .slice(0, 10)
                        .map((r) => `• ${r.name} (${r.type})`)
                        .join('\n');
                    return `Kết quả tìm kiếm cho "${value}" (${results.length}):\n${list}${results.length > 10 ? '\n... và ' + (results.length - 10) + ' kết quả khác' : ''}`;
                }
                case 'get-employee': {
                    const employees = await this.employeesService.list();
                    const found = employees.filter((e) => e.name.toLowerCase().includes((value || '').toLowerCase()));
                    if (found.length === 0) {
                        return `Không tìm thấy nhân viên "${value}".`;
                    }
                    if (found.length === 1) {
                        const emp = found[0];
                        return `Nhân viên: ${emp.name}\nVị trí: ${emp.position || 'Chưa xác định'}\nID: ${emp.id}`;
                    }
                    const list = found
                        .slice(0, 5)
                        .map((e) => `• ${e.name}`)
                        .join('\n');
                    return `Tìm thấy ${found.length} nhân viên:\n${list}`;
                }
                case 'get-department': {
                    const departments = await this.departmentsService.list();
                    const found = departments.filter((d) => d.name.toLowerCase().includes((value || '').toLowerCase()));
                    if (found.length === 0) {
                        return `Không tìm thấy phòng ban "${value}".`;
                    }
                    if (found.length === 1) {
                        const dept = found[0];
                        return `Phòng ban: ${dept.name}\nID: ${dept.id}`;
                    }
                    const list = found
                        .slice(0, 5)
                        .map((d) => `• ${d.name}`)
                        .join('\n');
                    return `Tìm thấy ${found.length} phòng ban:\n${list}`;
                }
                default:
                    return 'Không thể xử lý query này.';
            }
        }
        catch (error) {
            this.logger.error(`Error handling simple query: ${error}`);
            throw error;
        }
    }
    async handleFilteredQuery(type, filters, originalMessage) {
        this.logger.debug(`Handling filtered query: ${type}, filters: ${JSON.stringify(filters)}`);
        try {
            if (type === 'list-employees-filtered') {
                let employees = [];
                let filterContext = '';
                if (filters.department) {
                    try {
                        const dept = await this.departmentsService.findByName(filters.department);
                        employees = await this.employeesService.findByDepartment(dept.code);
                        filterContext = `Phòng ban: ${dept.name}`;
                    }
                    catch (error) {
                        return `Không tìm thấy phòng ban "${filters.department}". Hãy thử lại với tên chính xác.`;
                    }
                }
                else if (filters.skill) {
                    employees = await this.employeesService.findBySkill(filters.skill);
                    filterContext = `Kỹ năng: ${filters.skill}`;
                }
                else if (filters.project) {
                    employees = await this.employeesService.findByProject(filters.project);
                    filterContext = `Dự án: ${filters.project}`;
                }
                else if (filters.position) {
                    employees = await this.employeesService.findByPosition(filters.position);
                    filterContext = `Chức danh: ${filters.position}`;
                }
                if (!employees || employees.length === 0) {
                    return `Không tìm thấy nhân viên nào với điều kiện: ${filterContext}`;
                }
                const list = employees
                    .slice(0, 10)
                    .map((e, idx) => {
                    const skills = e.skills?.filter((s) => s.name).map((s) => s.name).join(', ') || 'N/A';
                    return `${idx + 1}. ${e.name} (${e.position || 'N/A'}) - Skills: ${skills}`;
                })
                    .join('\n');
                const moreInfo = employees.length > 10 ? `\n... và ${employees.length - 10} nhân viên khác` : '';
                return `📋 Danh sách nhân viên - ${filterContext} (${employees.length}):\n${list}${moreInfo}`;
            }
            return `Xin lỗi, tôi chưa hỗ trợ filter cho query type: ${type}`;
        }
        catch (error) {
            this.logger.error(`Error in handleFilteredQuery: ${error}`);
            return `Có lỗi xảy ra khi xử lý filtered query: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }
    async handleMediumQuery(type, value, message) {
        try {
            switch (type) {
                case 'aggregate': {
                    const employees = await this.employeesService.list();
                    const departments = await this.departmentsService.list();
                    const skills = await this.skillsService.list();
                    const projects = await this.projectsService.list();
                    return `📊 Thống kê hệ thống:\n• Nhân viên: ${employees.length}\n• Phòng ban: ${departments.length}\n• Kỹ năng: ${skills.length}\n• Dự án: ${projects.length}`;
                }
                case 'filter-search': {
                    try {
                        const results = await this.chromaDBService.search('employees', message, 5);
                        if (results.length > 0) {
                            const list = results
                                .map((r) => `• ${r.metadata.name} (Relevance: ${(r.similarity * 100).toFixed(1)}%)`)
                                .join('\n');
                            return `Nhân viên phù hợp:\n${list}`;
                        }
                    }
                    catch (err) {
                        this.logger.warn('ChromaDB search failed, falling back to text search');
                    }
                    const results = await this.searchService.search({ query: value || message });
                    if (results.length === 0) {
                        return `Không tìm thấy kết quả phù hợp.`;
                    }
                    const list = results
                        .slice(0, 5)
                        .map((r) => `• ${r.name}`)
                        .join('\n');
                    return `Kết quả tìm kiếm:\n${list}`;
                }
                case 'compare': {
                    return await this.geminiService.generateResponse(message, 'Bạn là một trợ lý thông minh cho hệ thống quản lý nhân sự. Hãy trả lời bằng tiếng Việt.');
                }
                case 'relationship': {
                    const results = await this.searchService.search({ query: value || message });
                    if (results.length === 0) {
                        return 'Không tìm thấy mối liên quan nào.';
                    }
                    const list = results
                        .slice(0, 5)
                        .map((r) => `• ${r.name} (${r.type})`)
                        .join('\n');
                    return `Mối liên quan tìm được:\n${list}`;
                }
                default:
                    return 'Không thể xử lý query này.';
            }
        }
        catch (error) {
            this.logger.error(`Error handling medium query: ${error}`);
            throw error;
        }
    }
    async handleComplexQuery(type, value, message) {
        try {
            let context = `Bạn là một trợ lý thông minh cho hệ thống quản lý nhân sự và dự án (EKG).\n\n`;
            try {
                const employees = await this.employeesService.list();
                const departments = await this.departmentsService.list();
                const projects = await this.projectsService.list();
                context += `Dữ liệu hiện tại:\n- Số nhân viên: ${employees.length}\n- Số phòng ban: ${departments.length}\n- Số dự án: ${projects.length}\n\n`;
            }
            catch (dbError) {
                this.logger.warn(`Could not fetch database context for complex query: ${dbError}`);
                context += `Lưu ý: Không thể truy cập dữ liệu database hiện tại.\n\n`;
            }
            context += `Hãy trả lời bằng tiếng Việt và cung cấp thông tin hữu ích dựa trên dữ liệu hệ thống.`;
            const response = await this.geminiService.generateResponse(message, context);
            return response;
        }
        catch (error) {
            this.logger.error(`Error handling complex query: ${error}`);
            throw error;
        }
    }
    async indexEntitiesToChromaDB() {
        try {
            this.logger.log('Starting to index entities to ChromaDB...');
            const employees = await this.employeesService.list();
            if (employees.length > 0) {
                const empDocs = employees.map((emp) => ({
                    id: emp.id,
                    content: `${emp.name} ${emp.position || ''} ${emp.email || ''}`,
                    metadata: {
                        type: 'employee',
                        name: emp.name,
                        position: emp.position,
                        email: emp.email,
                    },
                }));
                await this.chromaDBService.addDocuments('employees', empDocs);
            }
            const skills = await this.skillsService.list();
            if (skills.length > 0) {
                const skillDocs = skills.map((skill) => ({
                    id: skill.id,
                    content: skill.name,
                    metadata: {
                        type: 'skill',
                        name: skill.name,
                    },
                }));
                await this.chromaDBService.addDocuments('skills', skillDocs);
            }
            const departments = await this.departmentsService.list();
            if (departments.length > 0) {
                const deptDocs = departments.map((dept) => ({
                    id: dept.id,
                    content: dept.name,
                    metadata: {
                        type: 'department',
                        name: dept.name,
                    },
                }));
                await this.chromaDBService.addDocuments('departments', deptDocs);
            }
            const projects = await this.projectsService.list();
            if (projects.length > 0) {
                const projDocs = projects.map((proj) => ({
                    id: proj.id,
                    content: `${proj.name} ${proj.status || ''}`,
                    metadata: {
                        type: 'project',
                        name: proj.name,
                        status: proj.status,
                    },
                }));
                await this.chromaDBService.addDocuments('projects', projDocs);
            }
            this.logger.log('Indexing completed successfully');
        }
        catch (error) {
            this.logger.error(`Error indexing entities to ChromaDB: ${error}`);
            throw error;
        }
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [query_classifier_service_1.QueryClassifierService,
        ollama_service_1.OllamaService,
        chroma_db_service_1.ChromaDBService,
        gemini_service_1.GeminiService,
        employees_service_1.EmployeesService,
        skills_service_1.SkillsService,
        departments_service_1.DepartmentsService,
        projects_service_1.ProjectsService,
        search_service_1.SearchService])
], ChatService);
//# sourceMappingURL=chat.service.js.map