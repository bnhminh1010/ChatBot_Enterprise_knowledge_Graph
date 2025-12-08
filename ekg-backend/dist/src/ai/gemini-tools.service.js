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
var GeminiToolsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiToolsService = void 0;
const common_1 = require("@nestjs/common");
const positions_service_1 = require("../positions/positions.service");
const technologies_service_1 = require("../technologies/technologies.service");
const employees_service_1 = require("../employees/employees.service");
const departments_service_1 = require("../departments/departments.service");
const projects_service_1 = require("../projects/projects.service");
const skills_service_1 = require("../skills/skills.service");
const documents_service_1 = require("../documents/documents.service");
const chroma_db_service_1 = require("./chroma-db.service");
const ollama_service_1 = require("./ollama.service");
const query_cache_service_1 = require("../chat/services/query-cache.service");
const recommendation_service_1 = require("../chat/services/recommendation.service");
const scheduler_service_1 = require("../chat/services/scheduler.service");
let GeminiToolsService = GeminiToolsService_1 = class GeminiToolsService {
    positionsService;
    technologiesService;
    employeesService;
    departmentsService;
    projectsService;
    skillsService;
    documentsService;
    chromaDBService;
    ollamaService;
    queryCacheService;
    recommendationService;
    schedulerService;
    logger = new common_1.Logger(GeminiToolsService_1.name);
    CACHEABLE_TOOLS = new Set([
        'count_employees',
        'count_departments',
        'count_projects',
        'count_positions',
        'count_technologies',
        'list_skills',
        'search_departments_by_code',
        'get_department_by_id',
        'get_employee_by_id',
        'get_project_by_id',
    ]);
    CACHE_TTL = {
        count: 300,
        list: 600,
        get_by_id: 1800,
        default: 600,
    };
    constructor(positionsService, technologiesService, employeesService, departmentsService, projectsService, skillsService, documentsService, chromaDBService, ollamaService, queryCacheService, recommendationService, schedulerService) {
        this.positionsService = positionsService;
        this.technologiesService = technologiesService;
        this.employeesService = employeesService;
        this.departmentsService = departmentsService;
        this.projectsService = projectsService;
        this.skillsService = skillsService;
        this.documentsService = documentsService;
        this.chromaDBService = chromaDBService;
        this.ollamaService = ollamaService;
        this.queryCacheService = queryCacheService;
        this.recommendationService = recommendationService;
        this.schedulerService = schedulerService;
    }
    getTools() {
        return [
            ...this.getUniversalTools(),
            ...this.getEmployeeTools(),
            ...this.getPositionTools(),
            ...this.getDepartmentTools(),
            ...this.getProjectTools(),
            ...this.getTechnologyTools(),
            ...this.getSkillTools(),
            ...this.getDocumentTools(),
            ...this.getRecommendationTools(),
            ...this.getSchedulerTools(),
        ];
    }
    getUniversalTools() {
        return [
            {
                name: 'universal_search',
                description: '🌟 UNIVERSAL VECTOR SEARCH - TÌM BẤT KỲ THÔNG TIN GÌ trong hệ thống. ' +
                    'Tự động search qua: employees, projects, documents, skills, departments, positions, technologies. ' +
                    'USE THIS FIRST cho MỌI query search. ' +
                    'Agent TỰ GENERATE query phù hợp. ' +
                    'Examples: ' +
                    '- "tài liệu ZenDo" → query="ZenDo Focus App document" ' +
                    '- "senior dev React" → query="senior developer React programming" ' +
                    '- "dự án VinGroup" → query="VinGroup project client" ' +
                    'LUÔN ƯU TIÊN TOOL NÀY.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Free-form search query (tiếng Anh hoặc Việt). Agent TỰ NGHĨ RA query tốt nhất dựa trên câu hỏi của user. Include keywords, context, mô tả chi tiết.',
                        },
                        limit: {
                            type: 'number',
                            description: 'Số kết quả tối đa (default: 10)',
                        },
                    },
                    required: ['query'],
                },
            },
            {
                name: 'get_system_overview',
                description: '📊 TỔNG QUAN HỆ THỐNG - Lấy thống kê tổng hợp về tổ chức. ' +
                    'USE THIS when: "có gì trong hệ thống", "thống kê tổng hợp", "tóm tắt tổ chức", "dashboard", ' +
                    '"tổng quan nhân sự", "overview", "có bao nhiêu X Y Z", "số liệu tổng hợp". ' +
                    'Returns: counts of employees, departments, projects, skills, technologies.',
                parameters: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'rag_document_search',
                description: '📚 TÌM KIẾM TÀI LIỆU VỚI RAG - Tìm trong nội dung file/tài liệu đã upload. ' +
                    'USE THIS when: "nội dung tài liệu", "tìm trong file", "hướng dẫn sử dụng", ' +
                    '"đọc tài liệu", "tìm thông tin trong báo cáo", "file có gì", "đọc document". ' +
                    'Returns: relevant excerpts from documents with context.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Câu hỏi hoặc keyword để tìm trong nội dung tài liệu',
                        },
                        projectName: {
                            type: 'string',
                            description: 'Tên dự án để lọc tài liệu (optional)',
                        },
                        limit: {
                            type: 'number',
                            description: 'Số kết quả tối đa (default: 5)',
                        },
                    },
                    required: ['query'],
                },
            },
            {
                name: 'rag_knowledge_query',
                description: '🧠 TRẢ LỜI CÂU HỎI KIẾN THỨC PHỨC TẠP với RAG. ' +
                    'USE THIS when: câu hỏi cần tổng hợp nhiều nguồn, phân tích sâu, ' +
                    '"so sánh", "phân tích", "tổng hợp thông tin", "giải thích chi tiết". ' +
                    'Sử dụng Ollama + ChromaDB để tìm và tổng hợp câu trả lời.',
                parameters: {
                    type: 'object',
                    properties: {
                        question: {
                            type: 'string',
                            description: 'Câu hỏi cần trả lời',
                        },
                        context: {
                            type: 'string',
                            description: 'Ngữ cảnh bổ sung cho câu hỏi',
                        },
                        collection: {
                            type: 'string',
                            description: 'Collection để search: employees, projects, documents (default: all)',
                        },
                    },
                    required: ['question'],
                },
            },
            {
                name: 'generate_chart',
                description: '📊 TẠO BIỂU ĐỒ TỰ ĐỘNG từ dữ liệu. ' +
                    'USE THIS when: "vẽ biểu đồ", "chart", "thống kê", "phân bố", "tỉ lệ", ' +
                    '"biểu đồ tròn", "biểu đồ cột", "biểu đồ đường", "visualize", "hiển thị dạng đồ thị". ' +
                    'Returns: chart configuration for frontend rendering.',
                parameters: {
                    type: 'object',
                    properties: {
                        chartType: {
                            type: 'string',
                            description: 'Loại biểu đồ: bar (cột), pie (tròn), line (đường). Default: bar',
                        },
                        dataSource: {
                            type: 'string',
                            description: 'Nguồn dữ liệu: employees_by_department, employees_by_level, projects_by_status, skills_distribution, technologies_usage',
                        },
                        title: {
                            type: 'string',
                            description: 'Tiêu đề biểu đồ',
                        },
                    },
                    required: ['dataSource'],
                },
            },
        ];
    }
    getEmployeeTools() {
        return [
            {
                name: 'search_employees_by_name',
                description: 'Tìm nhân viên theo tên. USE THIS when: tìm nhân viên tên X. Keywords: tên, họ tên, name',
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Tên nhân viên' },
                    },
                },
            },
            {
                name: 'search_employees_by_level',
                description: 'Tìm nhân viên theo cấp bậc hiện tại. USE THIS when: nhân viên cấp bậc Staff. Keywords: cấp bậc hiện tại, level',
                parameters: {
                    type: 'object',
                    properties: { level: { type: 'string', description: 'Cấp bậc' } },
                },
            },
            {
                name: 'search_employees_by_email',
                description: 'Tìm nhân viên theo email. USE THIS when: email @company.com. Keywords: email',
                parameters: {
                    type: 'object',
                    properties: { email: { type: 'string', description: 'Email' } },
                },
            },
            {
                name: 'search_employees_by_phone',
                description: 'Tìm nhân viên theo số điện thoại. USE THIS when: số điện thoại 090. Keywords: phone, sđt',
                parameters: {
                    type: 'object',
                    properties: {
                        phone: { type: 'string', description: 'Số điện thoại' },
                    },
                },
            },
            {
                name: 'search_employees_by_status',
                description: 'Tìm nhân viên theo trạng thái. USE THIS when: nhân viên active. Keywords: trạng thái, status',
                parameters: {
                    type: 'object',
                    properties: { status: { type: 'string', description: 'Trạng thái' } },
                },
            },
            {
                name: 'get_employee_by_id',
                description: 'Lấy chi tiết nhân viên theo ID. USE THIS when: chi tiết nhân viên NS001. Keywords: chi tiết, ID',
                parameters: {
                    type: 'object',
                    properties: { id: { type: 'string', description: 'ID' } },
                    required: ['id'],
                },
            },
            {
                name: 'count_employees',
                description: 'Đếm tổng số nhân viên. USE THIS when: có bao nhiêu nhân viên, số lượng nhân viên. Keywords: đếm, tổng số, bao nhiêu, count',
                parameters: { type: 'object', properties: {} },
            },
            {
                name: 'search_employees_by_department',
                description: 'Tìm nhân viên trong phòng ban cụ thể. USE THIS when: nhân viên phòng IT, ai làm ở Marketing. Keywords: phòng ban, department',
                parameters: {
                    type: 'object',
                    properties: {
                        department: { type: 'string', description: 'Tên phòng ban' },
                    },
                    required: ['department'],
                },
            },
            {
                name: 'search_employees_advanced',
                description: 'Tìm kiếm nhân viên theo KỸ NĂNG, PHÒNG BAN, CHỨC DANH hoặc DỰ ÁN. USE THIS for: "nhân viên biết React", "danh sách nhân viên biết Python", "ai biết Java", "developer biết X", "nhân viên có kỹ năng Y", "Senior Engineer phòng Backend", "Frontend developer", "ai làm dự án APTX". ALWAYS use this tool when query mentions SKILLS or TECHNOLOGIES.',
                parameters: {
                    type: 'object',
                    properties: {
                        skill: {
                            type: 'string',
                            description: 'Tên kỹ năng/công nghệ (React, Python, Java, Node.js, Docker, etc.). Use when query has "biết", "có kỹ năng", "skill", or technology names.',
                        },
                        department: {
                            type: 'string',
                            description: 'Tên phòng ban (Frontend, Backend, QA, DevOps, etc.)',
                        },
                        position: {
                            type: 'string',
                            description: 'Chức danh (Developer, Engineer, Senior, Lead, Manager, etc.)',
                        },
                        level: {
                            type: 'string',
                            description: 'Cấp bậc (Junior, Mid, Senior, Lead, etc.)',
                        },
                        project: { type: 'string', description: 'Tên dự án' },
                    },
                },
            },
        ];
    }
    getPositionTools() {
        return [
            {
                name: 'search_positions_by_name',
                description: 'Tìm chức danh theo tên. USE THIS when: chức danh Engineer. Keywords: chức danh',
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Tên chức danh' },
                    },
                },
            },
            {
                name: 'search_positions_by_level',
                description: 'Tìm chức danh theo cấp bậc. USE THIS when: chức danh cấp bậc Staff. Keywords: chức danh cấp bậc',
                parameters: {
                    type: 'object',
                    properties: { level: { type: 'string', description: 'Cấp bậc' } },
                },
            },
            {
                name: 'search_positions_by_group',
                description: 'Tìm chức danh theo nhóm nghề. USE THIS when: nhóm nghề Engineering. Keywords: nhóm nghề',
                parameters: {
                    type: 'object',
                    properties: { group: { type: 'string', description: 'Nhóm nghề' } },
                },
            },
            {
                name: 'count_positions',
                description: 'Đếm tổng số chức danh. USE THIS when: có bao nhiêu chức danh, số lượng vị trí. Keywords: đếm, tổng số',
                parameters: { type: 'object', properties: {} },
            },
        ];
    }
    getDepartmentTools() {
        return [
            {
                name: 'search_departments_by_name',
                description: 'Tìm phòng ban theo tên. USE THIS when: phòng ban Frontend. Keywords: phòng ban',
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Tên phòng ban' },
                    },
                },
            },
            {
                name: 'search_departments_by_code',
                description: 'Tìm phòng ban theo mã. USE THIS when: mã phòng ban PB-IT. Keywords: mã phòng ban',
                parameters: {
                    type: 'object',
                    properties: { code: { type: 'string', description: 'Mã phòng ban' } },
                },
            },
            {
                name: 'get_department_by_id',
                description: 'Lấy chi tiết phòng ban theo ID. USE THIS when: chi tiết phòng ban PB001. Keywords: chi tiết',
                parameters: {
                    type: 'object',
                    properties: { id: { type: 'string', description: 'ID' } },
                    required: ['id'],
                },
            },
            {
                name: 'count_departments',
                description: 'Đếm tổng số phòng ban. USE THIS when: có bao nhiêu phòng ban, số lượng phòng ban. Keywords: đếm, tổng số',
                parameters: { type: 'object', properties: {} },
            },
        ];
    }
    getProjectTools() {
        return [
            {
                name: 'search_projects_by_name',
                description: '🔍 Tìm dự án theo TÊN - DÙNG ĐẦU TIÊN cho mọi query về dự án cụ thể. ' +
                    'USE THIS when user hỏi về: \"dự án APTX\", \"thông tin dự án X\", \"tìm project Y\", \"có dự án Z không\", \"dự án ABC là gì\". ' +
                    'Hỗ trợ fuzzy matching - không cần tên chính xác 100%. ' +
                    'Trả về: tên, khách hàng, lĩnh vực, loại, trạng thái, công nghệ, nhân viên. ' +
                    'Keywords: dự án, project, liên quan đến dự án, thông tin dự án, tìm dự án',
                parameters: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Tên dự án hoặc từ khóa (ví dụ: "APTX", "ZenDo", "Enterprise"). Trích xuất từ câu hỏi của user.',
                        },
                    },
                    required: ['name'],
                },
            },
            {
                name: 'search_projects_by_client',
                description: 'Tìm dự án theo khách hàng. USE THIS when: dự án khách hàng VinGroup. Keywords: khách hàng',
                parameters: {
                    type: 'object',
                    properties: { client: { type: 'string', description: 'Khách hàng' } },
                },
            },
            {
                name: 'search_projects_by_status',
                description: 'Tìm dự án theo trạng thái. USE THIS when: dự án In Progress. Keywords: trạng thái dự án',
                parameters: {
                    type: 'object',
                    properties: { status: { type: 'string', description: 'Trạng thái' } },
                },
            },
            {
                name: 'search_projects_by_field',
                description: 'Tìm dự án theo lĩnh vực. USE THIS when: dự án lĩnh vực Fintech. Keywords: lĩnh vực',
                parameters: {
                    type: 'object',
                    properties: { field: { type: 'string', description: 'Lĩnh vực' } },
                },
            },
            {
                name: 'search_projects_by_type',
                description: 'Tìm dự án theo loại. USE THIS when: dự án loại Internal. Keywords: loại dự án',
                parameters: {
                    type: 'object',
                    properties: { type: { type: 'string', description: 'Loại' } },
                },
            },
            {
                name: 'get_project_by_id',
                description: 'Lấy chi tiết dự án theo ID. USE THIS when: chi tiết dự án DA001. Keywords: chi tiết',
                parameters: {
                    type: 'object',
                    properties: { id: { type: 'string', description: 'ID' } },
                    required: ['id'],
                },
            },
            {
                name: 'count_projects',
                description: 'Đếm tổng số dự án. USE THIS when: có bao nhiêu dự án, số lượng project. Keywords: đếm, tổng số',
                parameters: { type: 'object', properties: {} },
            },
            {
                name: 'get_project_manager',
                description: 'Tìm người quản lý (PM) của dự án. USE THIS when: ai quản lý dự án X, PM của dự án Y. Keywords: quản lý, PM, manager',
                parameters: {
                    type: 'object',
                    properties: {
                        projectName: { type: 'string', description: 'Tên dự án' },
                    },
                    required: ['projectName'],
                },
            },
        ];
    }
    getTechnologyTools() {
        return [
            {
                name: 'search_technologies_by_name',
                description: 'Tìm công nghệ theo tên. USE THIS when: công nghệ React. Keywords: công nghệ',
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Tên công nghệ' },
                    },
                },
            },
            {
                name: 'search_technologies_by_type',
                description: 'Tìm công nghệ theo loại. USE THIS when: công nghệ loại Framework. Keywords: loại công nghệ',
                parameters: {
                    type: 'object',
                    properties: { type: { type: 'string', description: 'Loại' } },
                },
            },
            {
                name: 'count_technologies',
                description: 'Đếm tổng số công nghệ. USE THIS when: có bao nhiêu công nghệ, số lượng technology. Keywords: đếm, tổng số',
                parameters: { type: 'object', properties: {} },
            },
        ];
    }
    getSkillTools() {
        return [
            {
                name: 'list_skills',
                description: '⚠️ LIST ALL SKILLS ⚠️ Use THIS tool when user asks: "danh sách kỹ năng", "tất cả kỹ năng", "có những kỹ năng gì", "liệt kê kỹ năng", "skill list". Returns: Array of ALL skill objects {id, name, category}. NO LIMIT. IMPORTANT: This tool lists SKILLS ONLY, NOT employees. DO NOT use search_employees tools when user asks for skill list.',
                parameters: { type: 'object', properties: {} },
            },
        ];
    }
    getDocumentTools() {
        return [
            {
                name: 'get_document_content',
                description: 'Lấy NỘI DUNG tài liệu theo ID. ' +
                    '⚠️ CHỈ DÙNG KHI ĐÃ BIẾT docId (ví dụ: TL001, TL002). ' +
                    'Nếu user hỏi theo TÊN → dùng search_documents TRƯỚC để tìm docId. ' +
                    'projectId là OPTIONAL - chỉ cần nếu document thuộc project. ' +
                    'Company documents (như TL001) KHÔNG CẦN projectId. ' +
                    'Trả về nội dung + LINK DOWNLOAD. ' +
                    'Keywords: nội dung tài liệu, đọc file, xem tài liệu',
                parameters: {
                    type: 'object',
                    properties: {
                        docId: {
                            type: 'string',
                            description: 'ID của tài liệu (VD: "TL001", "TL002"). BẮT BUỘC.',
                        },
                        projectId: {
                            type: 'string',
                            description: 'ID của dự án (OPTIONAL - chỉ cần cho project documents)',
                        },
                    },
                    required: ['docId'],
                },
            },
            {
                name: 'list_project_documents',
                description: 'Liệt kê tất cả TÀI LIỆU của một dự án. USE THIS when: danh sách tài liệu, dự án có tài liệu gì, liệt kê file. Keywords: danh sách tài liệu, tài liệu dự án',
                parameters: {
                    type: 'object',
                    properties: {
                        projectId: {
                            type: 'string',
                            description: 'ID của dự án (ví dụ: "DuAn_test_001")',
                        },
                    },
                    required: ['projectId'],
                },
            },
            {
                name: 'search_documents',
                description: '🔍 **PRIMARY TOOL FOR DOCUMENTS** - TÌM KIẾM tài liệu theo TÊN (không cần ID). ' +
                    '⚠️ USE THIS FIRST khi user hỏi về tài liệu BẤT KỲ: "lấy tài liệu X", "tài liệu về Y", "file Z", "doc ABC". ' +
                    'ĐỪNG hỏi user về ID - hãy tìm theo TÊN trước! ' +
                    'Examples: ' +
                    '- "lấy tài liệu thiết kế UI" → search with name="thiết kế UI" ' +
                    '- "tài liệu về API" → search with name="API" ' +
                    '- "file README" → search with name="README" ' +
                    'Response cases: ' +
                    '1 result → auto get content | ' +
                    'Multiple → show numbered list | ' +
                    '0 → suggest alternative names',
                parameters: {
                    type: 'object',
                    properties: {
                        documentName: {
                            type: 'string',
                            description: 'TÊN tài liệu để tìm. Extract từ câu hỏi của user (ví dụ: user nói "lấy tài liệu thiết kế" → documentName="thiết kế")',
                        },
                        projectId: {
                            type: 'string',
                            description: 'ID dự án (OPTIONAL). Chỉ điền nếu user EXPLICITLY nói tên dự án cụ thể.',
                        },
                    },
                    required: ['documentName'],
                },
            },
        ];
    }
    getRecommendationTools() {
        return [
            {
                name: 'recommend_employees_for_project',
                description: '🎯 ĐỀ XUẤT NHÂN VIÊN PHÙ HỢP cho dự án. ' +
                    'USE THIS when: "ai phù hợp làm dự án X", "gợi ý người cho project Y", "team nào nên làm Z", ' +
                    '"đề xuất nhân sự", "tìm người phù hợp", "recommend người", "ai nên tham gia dự án". ' +
                    'Phân tích skills, workload, experience để match tốt nhất.',
                parameters: {
                    type: 'object',
                    properties: {
                        projectName: {
                            type: 'string',
                            description: 'Tên dự án cần tìm nhân viên phù hợp',
                        },
                        requiredSkills: {
                            type: 'array',
                            description: 'Danh sách kỹ năng yêu cầu (optional)',
                            items: { type: 'string' },
                        },
                        limit: {
                            type: 'number',
                            description: 'Số lượng gợi ý (default: 5)',
                        },
                    },
                    required: ['projectName'],
                },
            },
            {
                name: 'recommend_training_for_employee',
                description: '📚 ĐỀ XUẤT ĐÀO TẠO cho nhân viên CỤ THỂ dựa trên skill gaps. ' +
                    'USE THIS when: "nhân viên X nên học gì", "đề xuất training cho Y", ' +
                    '"cần cải thiện kỹ năng gì", "lộ trình phát triển". REQUIRES employee name/ID.',
                parameters: {
                    type: 'object',
                    properties: {
                        employeeId: { type: 'string', description: 'ID nhân viên' },
                        employeeName: { type: 'string', description: 'Tên nhân viên' },
                    },
                },
            },
            {
                name: 'find_employees_needing_training',
                description: '📊 TÌM TẤT CẢ NHÂN VIÊN CẦN ĐÀO TẠO BỔ SUNG dựa trên skill gaps. ' +
                    'USE THIS when: "tìm nhân sự cần học bổ sung", "ai cần đào tạo", "nhân viên nào thiếu skill", ' +
                    '"team nào cần training", "phòng ban nào cần bổ sung kỹ năng", "skill gaps trong công ty", ' +
                    '"danh sách cần học thêm", "ai chưa biết công nghệ mới". ' +
                    'KHÔNG cần chỉ định tên - tự động tìm tất cả nhân viên có skill gaps so với trending skills.',
                parameters: {
                    type: 'object',
                    properties: {
                        limit: {
                            type: 'number',
                            description: 'Số lượng nhân viên trả về (default: 10)',
                        },
                    },
                },
            },
            {
                name: 'recommend_projects_for_employee',
                description: '🚀 GỢI Ý DỰ ÁN PHÙ HỢP cho nhân viên dựa trên skills. ' +
                    'USE THIS when: "dự án nào phù hợp với X", "gợi ý project cho nhân viên Y", ' +
                    '"nên assign nhân viên Z vào dự án nào".',
                parameters: {
                    type: 'object',
                    properties: {
                        employeeId: { type: 'string', description: 'ID nhân viên' },
                        employeeName: { type: 'string', description: 'Tên nhân viên' },
                        limit: {
                            type: 'number',
                            description: 'Số lượng gợi ý (default: 3)',
                        },
                    },
                },
            },
        ];
    }
    getSchedulerTools() {
        return [
            {
                name: 'suggest_meeting_time',
                description: '📅 ĐỀ XUẤT THỜI GIAN HỌP cho một nhóm người. ' +
                    'USE THIS when: "sắp xếp họp với team X", "lịch họp", "khi nào rảnh", ' +
                    '"đặt meeting", "book cuộc họp", "tìm thời gian họp".',
                parameters: {
                    type: 'object',
                    properties: {
                        participants: {
                            type: 'array',
                            description: 'Danh sách tên nhân viên tham gia',
                            items: { type: 'string' },
                        },
                        duration: {
                            type: 'number',
                            description: 'Thời lượng họp (phút), default: 60',
                        },
                        preferredDate: {
                            type: 'string',
                            description: 'Ngày ưu tiên (YYYY-MM-DD), default: hôm nay',
                        },
                    },
                    required: ['participants'],
                },
            },
            {
                name: 'create_task',
                description: '✅ TẠO TASK MỚI trong hệ thống. ' +
                    'USE THIS when: "tạo task", "giao việc", "thêm công việc mới", "assign task", ' +
                    '"tạo nhiệm vụ", "add task".',
                parameters: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', description: 'Tiêu đề task (BẮT BUỘC)' },
                        description: { type: 'string', description: 'Mô tả chi tiết' },
                        deadline: { type: 'string', description: 'Deadline (YYYY-MM-DD)' },
                        priority: {
                            type: 'string',
                            description: 'Độ ưu tiên: low, medium, high. Default: medium',
                        },
                        projectName: { type: 'string', description: 'Tên dự án liên quan' },
                        assigneeName: {
                            type: 'string',
                            description: 'Tên nhân viên được giao',
                        },
                    },
                    required: ['title'],
                },
            },
            {
                name: 'assign_task_to_employee',
                description: '👤 GÁN TASK CHO NHÂN VIÊN. ' +
                    'USE THIS when: "giao task X cho Y", "assign việc", "phân công task".',
                parameters: {
                    type: 'object',
                    properties: {
                        taskTitle: { type: 'string', description: 'Tiêu đề task' },
                        employeeName: { type: 'string', description: 'Tên nhân viên' },
                    },
                    required: ['taskTitle', 'employeeName'],
                },
            },
            {
                name: 'get_team_availability',
                description: '📊 XEM WORKLOAD CỦA TEAM - ai đang rảnh, ai đang bận. ' +
                    'USE THIS when: "ai đang rảnh", "workload", "team nào bận", ' +
                    '"còn capacity không", "availability", "sức load của team".',
                parameters: {
                    type: 'object',
                    properties: {
                        departmentName: {
                            type: 'string',
                            description: 'Tên phòng ban (optional, không điền = toàn công ty)',
                        },
                    },
                },
            },
        ];
    }
    async executeTool(name, args) {
        this.logger.log(`🔧 Executing tool: ${name} with args: ${JSON.stringify(args)}`);
        let result;
        try {
            if (this.CACHEABLE_TOOLS.has(name) &&
                this.queryCacheService.isAvailable()) {
                const cachedResult = await this.queryCacheService.get(name, args);
                if (cachedResult) {
                    this.logger.log(`🎯 Cache hit for ${name}`);
                    return cachedResult;
                }
            }
            if (name === 'universal_search') {
                const query = args.query;
                const limit = args.limit || 10;
                this.logger.log(`🌟 Universal search: "${query}" (limit: ${limit})`);
                const results = await Promise.all([
                    this.chromaDBService
                        .search('employees', query, limit)
                        .catch(() => []),
                    this.chromaDBService
                        .search('departments', query, limit)
                        .catch(() => []),
                    this.chromaDBService.search('projects', query, limit).catch(() => []),
                    this.chromaDBService.search('skills', query, limit).catch(() => []),
                ]);
                const allResults = results
                    .flat()
                    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
                    .slice(0, limit);
                this.logger.log(`✅ Found ${allResults.length} results via vector search`);
                return {
                    data: allResults,
                    total: allResults.length,
                    message: `Tìm thấy ${allResults.length} kết quả cho "${query}"`,
                };
            }
            if (name === 'get_system_overview') {
                const [employeeCount, departmentCount, projectCount, positionCount, technologyCount,] = await Promise.all([
                    this.employeesService.count().catch(() => 0),
                    this.departmentsService.count().catch(() => 0),
                    this.projectsService.count().catch(() => 0),
                    this.positionsService.count().catch(() => 0),
                    this.technologiesService.count().catch(() => 0),
                ]);
                return {
                    data: {
                        employees: employeeCount,
                        departments: departmentCount,
                        projects: projectCount,
                        positions: positionCount,
                        technologies: technologyCount,
                    },
                    message: `📊 Tổng quan hệ thống:\n` +
                        `• Nhân viên: ${employeeCount}\n` +
                        `• Phòng ban: ${departmentCount}\n` +
                        `• Dự án: ${projectCount}\n` +
                        `• Chức danh: ${positionCount}\n` +
                        `• Công nghệ: ${technologyCount}`,
                };
            }
            if (name === 'rag_document_search') {
                const query = args.query;
                const limit = args.limit || 5;
                this.logger.log(`📚 RAG Document Search: "${query}"`);
                const docResults = await this.chromaDBService
                    .search('documents', query, limit)
                    .catch(() => []);
                if (docResults.length === 0) {
                    return {
                        data: [],
                        message: 'Không tìm thấy tài liệu liên quan. Vui lòng thử từ khóa khác.',
                    };
                }
                const formattedResults = docResults.map((doc, idx) => ({
                    rank: idx + 1,
                    title: doc.metadata?.title || doc.metadata?.name || 'Untitled',
                    excerpt: doc.content?.substring(0, 300) + '...',
                    similarity: (doc.similarity * 100).toFixed(1) + '%',
                    project: doc.metadata?.project || 'N/A',
                }));
                return {
                    data: formattedResults,
                    message: `📚 Tìm thấy ${docResults.length} tài liệu liên quan đến "${query}"`,
                };
            }
            if (name === 'rag_knowledge_query') {
                const question = args.question;
                const collection = args.collection || 'employees';
                const limit = 5;
                this.logger.log(`🧠 RAG Knowledge Query: "${question}"`);
                const searchResults = await this.chromaDBService
                    .search(collection, question, limit)
                    .catch(() => []);
                if (searchResults.length === 0) {
                    return {
                        data: null,
                        message: 'Không tìm thấy thông tin liên quan để trả lời câu hỏi.',
                    };
                }
                const context = searchResults
                    .map((r, idx) => `[${idx + 1}] ${r.content}`)
                    .join('\n\n');
                const ollamaAvailable = await this.ollamaService
                    .isHealthy()
                    .catch(() => false);
                if (ollamaAvailable) {
                    const prompt = `Dựa trên context sau, trả lời câu hỏi: "${question}"

CONTEXT:
${context}

Trả lời bằng tiếng Việt, ngắn gọn và chính xác:`;
                    try {
                        const ollamaResponse = await this.ollamaService.generateResponse(prompt, 'qwen2.5:7b');
                        return {
                            data: {
                                answer: ollamaResponse,
                                sources: searchResults.length,
                                method: 'ollama_rag',
                            },
                            message: ollamaResponse,
                        };
                    }
                    catch (error) {
                        this.logger.warn(`Ollama failed, returning raw results: ${error}`);
                    }
                }
                return {
                    data: {
                        contexts: searchResults.map((r) => ({
                            content: r.content?.substring(0, 200),
                            similarity: (r.similarity * 100).toFixed(1) + '%',
                        })),
                        method: 'vector_search',
                    },
                    message: `Tìm thấy ${searchResults.length} kết quả liên quan:\n` +
                        searchResults
                            .slice(0, 3)
                            .map((r, i) => `${i + 1}. ${r.content?.substring(0, 100)}...`)
                            .join('\n'),
                };
            }
            if (name === 'generate_chart') {
                const chartType = args.chartType || 'bar';
                const dataSource = args.dataSource;
                const title = args.title || 'Biểu đồ thống kê';
                this.logger.log(`📊 Generate Chart: ${chartType} - ${dataSource}`);
                const chartData = [
                    { name: 'Frontend', value: 5 },
                    { name: 'Backend', value: 8 },
                    { name: 'DevOps', value: 3 },
                    { name: 'QA', value: 4 },
                    { name: 'Mobile', value: 2 },
                ];
                return {
                    type: 'chart',
                    chartType,
                    title,
                    data: chartData,
                    message: `📊 Đã tạo biểu đồ ${chartType}: "${title}" với ${chartData.length} mục dữ liệu.`,
                };
            }
            if (name === 'search_employees_by_name') {
                const result = await this.employeesService.findByName(args.name);
                return { data: result };
            }
            if (name === 'search_employees_by_level') {
                const result = await this.employeesService.searchByLevel(args.level);
                return { data: result };
            }
            if (name === 'search_employees_by_email') {
                const result = await this.employeesService.searchByEmail(args.email);
                return { data: result };
            }
            if (name === 'search_employees_by_phone') {
                const result = await this.employeesService.searchByPhone(args.phone);
                return { data: result };
            }
            if (name === 'search_employees_by_status') {
                const result = await this.employeesService.searchByStatus(args.status);
                return { data: result };
            }
            if (name === 'get_employee_by_id') {
                const result = await this.employeesService.getById(args.id);
                return { data: result };
            }
            if (name === 'count_employees') {
                const count = await this.employeesService.count();
                return { total: count, message: `Tổng số nhân viên: ${count}` };
            }
            if (name === 'search_employees_by_department') {
                const result = await this.employeesService.findByDepartment(args.department);
                return { data: result };
            }
            if (name === 'search_employees_advanced') {
                const result = await this.employeesService.findByCriteria(args);
                return { data: result };
            }
            if (name === 'search_positions_by_name') {
                const result = await this.positionsService.search({ name: args.name });
                return { data: result };
            }
            if (name === 'search_positions_by_level') {
                const result = await this.positionsService.search({
                    level: args.level,
                });
                return { data: result };
            }
            if (name === 'search_positions_by_group') {
                const result = await this.positionsService.search({
                    group: args.group,
                });
                return { data: result };
            }
            if (name === 'count_positions') {
                const count = await this.positionsService.count();
                return { total: count, message: `Tổng số chức danh: ${count}` };
            }
            if (name === 'search_departments_by_name') {
                const result = await this.departmentsService.findByName(args.name);
                return { data: result };
            }
            if (name === 'search_departments_by_code') {
                const result = await this.departmentsService.searchByCode(args.code);
                return { data: result };
            }
            if (name === 'get_department_by_id') {
                const result = await this.departmentsService.getById(args.id);
                return { data: result };
            }
            if (name === 'count_departments') {
                const count = await this.departmentsService.count();
                return { total: count, message: `Tổng số phòng ban: ${count}` };
            }
            if (name === 'search_projects_by_name') {
                const result = await this.projectsService.searchByName(args.name);
                return {
                    data: result.projects,
                    graphData: result.graphData,
                };
            }
            if (name === 'search_projects_by_client') {
                const result = await this.projectsService.searchByClient(args.client);
                return { data: result };
            }
            if (name === 'search_projects_by_status') {
                const result = await this.projectsService.searchByStatus(args.status);
                return { data: result };
            }
            if (name === 'search_projects_by_field') {
                const result = await this.projectsService.searchByField(args.field);
                return { data: result };
            }
            if (name === 'search_projects_by_type') {
                const result = await this.projectsService.searchByType(args.type);
                return { data: result };
            }
            if (name === 'get_project_by_id') {
                const result = await this.projectsService.getById(args.id);
                return { data: result };
            }
            if (name === 'count_projects') {
                const count = await this.projectsService.count();
                return { total: count, message: `Tổng số dự án: ${count}` };
            }
            if (name === 'get_project_manager') {
                const result = await this.projectsService.getProjectManager(args.projectName);
                if (!result)
                    return {
                        message: `Không tìm thấy người quản lý cho dự án "${args.projectName}"`,
                    };
                return { data: result };
            }
            if (name === 'search_technologies_by_name') {
                const result = await this.technologiesService.search({
                    name: args.name,
                });
                return { data: result };
            }
            if (name === 'search_technologies_by_type') {
                const result = await this.technologiesService.search({
                    type: args.type,
                });
                return { data: result };
            }
            if (name === 'count_technologies') {
                const count = await this.technologiesService.count();
                return { total: count, message: `Tổng số công nghệ: ${count}` };
            }
            if (name === 'list_skills') {
                const result = await this.skillsService.list();
                return { data: result };
            }
            if (name === 'get_document_content') {
                let result;
                if (args.projectId) {
                    result = await this.documentsService.getDocumentContent(args.projectId, args.docId);
                }
                else {
                    result = await this.documentsService.getDocumentContentDirect(args.docId);
                }
                const contentPreview = result.content.length > 1000
                    ? result.content.substring(0, 1000) + '...(đã cắt bớt)'
                    : result.content;
                return {
                    documentName: result.documentName,
                    documentType: result.documentType,
                    fileType: result.fileInfo.type,
                    contentLength: result.content.length,
                    content: contentPreview,
                    sourceUrl: result.sourceUrl,
                    downloadUrl: result.sourceUrl,
                    message: `Tài liệu "${result.documentName}" (${result.fileInfo.type}, ${result.fileInfo.size} bytes). Link tải: ${result.sourceUrl}`,
                };
            }
            if (name === 'list_project_documents') {
                let projectId = args.projectId;
                if (projectId && !projectId.match(/^[0-9a-f]{8}-[0-9a-f]{4}/i)) {
                    try {
                        const searchResult = await this.projectsService.searchByName(projectId);
                        const projects = searchResult?.projects || [];
                        if (projects.length > 0) {
                            projectId = projects[0].id || projects[0].code;
                            this.logger.log(`Resolved project name "${args.projectId}" to ID "${projectId}"`);
                        }
                    }
                    catch (e) {
                        this.logger.warn(`Could not find project by name: ${args.projectId}`);
                    }
                }
                const result = await this.documentsService.getProjectDocuments(projectId);
                return { data: result };
            }
            if (name === 'search_documents') {
                const results = await this.documentsService.searchDocumentsByName(args.documentName, args.projectId);
                if (results.length === 0) {
                    return {
                        found: false,
                        count: 0,
                        message: `Không tìm thấy tài liệu nào có tên chứa "${args.documentName}". Hãy thử tên khác hoặc liệt kê tất cả tài liệu.`,
                    };
                }
                if (results.length === 1) {
                    const doc = results[0];
                    const hasProject = doc.projectId && doc.projectId !== 'unknown';
                    return {
                        found: true,
                        count: 1,
                        autoSelect: true,
                        document: {
                            id: doc.id,
                            name: doc.name,
                            description: doc.mo_ta,
                            projectId: doc.projectId || null,
                            type: doc.loai,
                            hasPath: doc.co_duong_dan,
                        },
                        message: `Tìm thấy tài liệu: "${doc.name}" (ID: ${doc.id}). Đang lấy nội dung...`,
                        nextAction: hasProject
                            ? `Gọi get_document_content với docId="${doc.id}" và projectId="${doc.projectId}"`
                            : `Gọi get_document_content với docId="${doc.id}" (company document, không cần projectId)`,
                    };
                }
                return {
                    found: true,
                    count: results.length,
                    documents: results.map((doc, index) => ({
                        index: index + 1,
                        id: doc.id,
                        name: doc.name,
                        description: doc.mo_ta,
                        projectId: doc.projectId || 'unknown',
                        type: doc.loai,
                        hasPath: doc.co_duong_dan,
                    })),
                    message: `Tìm thấy ${results.length} tài liệu phù hợp với "${args.documentName}". Vui lòng chọn tài liệu bạn muốn xem.`,
                };
            }
            if (name === 'recommend_employees_for_project') {
                const { recommendations, projectInfo } = await this.recommendationService.recommendEmployeesForProject(args.projectName, args.requiredSkills, args.limit);
                if (!projectInfo) {
                    return {
                        data: null,
                        message: `Không tìm thấy dự án "${args.projectName}"`,
                    };
                }
                if (recommendations.length === 0) {
                    return {
                        type: 'recommendation',
                        projectInfo,
                        data: [],
                        message: `Không tìm thấy nhân viên phù hợp cho dự án "${projectInfo.name}". Có thể tất cả đều đang bận hoặc không match skills.`,
                    };
                }
                const formatted = recommendations.map((r, idx) => ({
                    rank: idx + 1,
                    name: r.employee.name,
                    position: r.employee.position,
                    department: r.employee.department,
                    matchScore: `${r.matchScore}%`,
                    matchingSkills: r.matchingSkills,
                    workload: r.currentWorkload,
                    reason: r.reason,
                }));
                return {
                    type: 'recommendation',
                    projectInfo,
                    data: formatted,
                    message: `🎯 Đề xuất ${recommendations.length} nhân viên phù hợp cho dự án "${projectInfo.name}":`,
                };
            }
            if (name === 'recommend_training_for_employee') {
                const { suggestions, employee } = await this.recommendationService.recommendTrainingForEmployee(args.employeeId, args.employeeName);
                if (!employee) {
                    return {
                        data: null,
                        message: `Không tìm thấy nhân viên`,
                    };
                }
                return {
                    type: 'training_recommendation',
                    employee,
                    data: suggestions,
                    message: suggestions.length > 0
                        ? `📚 Đề xuất đào tạo cho ${employee.name}:`
                        : `${employee.name} đã có đầy đủ các kỹ năng trending trong công ty!`,
                };
            }
            if (name === 'recommend_projects_for_employee') {
                const { recommendations, employee } = await this.recommendationService.recommendProjectsForEmployee(args.employeeId, args.employeeName, args.limit);
                if (!employee) {
                    return {
                        data: null,
                        message: `Không tìm thấy nhân viên`,
                    };
                }
                return {
                    type: 'project_recommendation',
                    employee,
                    data: recommendations,
                    message: recommendations.length > 0
                        ? `🚀 Gợi ý ${recommendations.length} dự án phù hợp cho ${employee.name}:`
                        : `Không có dự án phù hợp hoặc ${employee.name} đã tham gia tất cả dự án.`,
                };
            }
            if (name === 'find_employees_needing_training') {
                const { employees, trendingSkills } = await this.recommendationService.findEmployeesNeedingTraining(args.limit || 10);
                return {
                    type: 'training_needs_report',
                    trendingSkills,
                    data: employees,
                    message: employees.length > 0
                        ? `📊 Tìm thấy ${employees.length} nhân viên cần đào tạo bổ sung. Trending skills: ${trendingSkills.join(', ')}`
                        : `Tất cả nhân viên đã có đầy đủ các kỹ năng trending!`,
                };
            }
            if (name === 'suggest_meeting_time') {
                const suggestions = await this.schedulerService.suggestMeetingTime(args.participants, args.duration || 60, args.preferredDate);
                return {
                    type: 'meeting_suggestion',
                    data: suggestions,
                    message: `📅 Đề xuất ${suggestions.length} khung giờ họp:`,
                };
            }
            if (name === 'create_task') {
                const task = await this.schedulerService.createTask({
                    title: args.title,
                    description: args.description,
                    deadline: args.deadline,
                    priority: args.priority,
                    projectName: args.projectName,
                    assigneeName: args.assigneeName,
                });
                return {
                    type: 'task_created',
                    data: task,
                    message: `✅ Đã tạo task "${task.title}" (ID: ${task.id})${task.assignee ? ` và giao cho ${task.assignee.name}` : ''}${task.project ? ` trong dự án ${task.project.name}` : ''}.`,
                };
            }
            if (name === 'assign_task_to_employee') {
                const result = await this.schedulerService.assignTask(undefined, args.taskTitle, args.employeeName);
                if (!result.success) {
                    return {
                        data: null,
                        message: `Không tìm thấy task hoặc nhân viên. Vui lòng kiểm tra lại.`,
                    };
                }
                return {
                    type: 'task_assigned',
                    data: result,
                    message: `👤 Đã giao task "${result.task?.title}" cho ${result.employee?.name}. Status: in_progress`,
                };
            }
            if (name === 'get_team_availability') {
                const availability = await this.schedulerService.getTeamAvailability(args.departmentName);
                const summary = {
                    available: availability.filter(a => a.availability === 'available').length,
                    busy: availability.filter(a => a.availability === 'busy').length,
                    overloaded: availability.filter(a => a.availability === 'overloaded').length,
                };
                return {
                    type: 'team_availability',
                    data: availability,
                    summary,
                    message: args.departmentName
                        ? `📊 Workload của team ${args.departmentName}:`
                        : `📊 Workload toàn công ty:`,
                };
            }
            return { error: `Tool ${name} not found` };
        }
        catch (error) {
            this.logger.error(`Tool execution error: ${error}`);
            return {
                error: `Error: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
        finally {
            if (result &&
                !result.error &&
                this.CACHEABLE_TOOLS.has(name) &&
                this.queryCacheService.isAvailable()) {
                const ttl = this.getCacheTTL(name);
                await this.queryCacheService.set(name, args, result, ttl);
            }
        }
    }
    getCacheTTL(toolName) {
        if (toolName.startsWith('count_'))
            return this.CACHE_TTL.count;
        if (toolName.startsWith('list_'))
            return this.CACHE_TTL.list;
        if (toolName.includes('_by_id'))
            return this.CACHE_TTL.get_by_id;
        return this.CACHE_TTL.default;
    }
    getDefaultChartTitle(dataSource) {
        const titles = {
            employees_by_department: 'Nhân viên theo phòng ban',
            employees_by_level: 'Nhân viên theo cấp bậc',
            projects_by_status: 'Dự án theo trạng thái',
            skills_distribution: 'Phân bố kỹ năng',
            technologies_usage: 'Công nghệ được sử dụng',
        };
        return titles[dataSource] || 'Biểu đồ thống kê';
    }
};
exports.GeminiToolsService = GeminiToolsService;
exports.GeminiToolsService = GeminiToolsService = GeminiToolsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [positions_service_1.PositionsService,
        technologies_service_1.TechnologiesService,
        employees_service_1.EmployeesService,
        departments_service_1.DepartmentsService,
        projects_service_1.ProjectsService,
        skills_service_1.SkillsService,
        documents_service_1.DocumentsService,
        chroma_db_service_1.ChromaDBService,
        ollama_service_1.OllamaService,
        query_cache_service_1.QueryCacheService,
        recommendation_service_1.RecommendationService,
        scheduler_service_1.SchedulerService])
], GeminiToolsService);
//# sourceMappingURL=gemini-tools.service.js.map