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
var FunctionCallingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionCallingService = void 0;
const common_1 = require("@nestjs/common");
const employees_service_1 = require("../employees/employees.service");
const departments_service_1 = require("../departments/departments.service");
const projects_service_1 = require("../projects/projects.service");
const skills_service_1 = require("../skills/skills.service");
const companies_service_1 = require("../companies/companies.service");
const positions_service_1 = require("../positions/positions.service");
const technologies_service_1 = require("../technologies/technologies.service");
const locations_service_1 = require("../locations/locations.service");
const units_service_1 = require("../units/units.service");
let FunctionCallingService = FunctionCallingService_1 = class FunctionCallingService {
    employeesService;
    departmentsService;
    projectsService;
    skillsService;
    companiesService;
    positionsService;
    technologiesService;
    locationsService;
    unitsService;
    logger = new common_1.Logger(FunctionCallingService_1.name);
    constructor(employeesService, departmentsService, projectsService, skillsService, companiesService, positionsService, technologiesService, locationsService, unitsService) {
        this.employeesService = employeesService;
        this.departmentsService = departmentsService;
        this.projectsService = projectsService;
        this.skillsService = skillsService;
        this.companiesService = companiesService;
        this.positionsService = positionsService;
        this.technologiesService = technologiesService;
        this.locationsService = locationsService;
        this.unitsService = unitsService;
    }
    async executeFunctionCall(functionName, args) {
        this.logger.debug(`Executing function: ${functionName} with args:`, args);
        try {
            switch (functionName) {
                case 'search_employees':
                    return await this.searchEmployees(args);
                case 'get_employee_details':
                    return await this.getEmployeeDetails(args);
                case 'list_departments':
                    return await this.listDepartments(args);
                case 'list_projects':
                    return await this.listProjects(args);
                case 'list_skills':
                    return await this.listSkills(args);
                case 'aggregate_stats':
                    return await this.getAggregateStats();
                case 'find_employees_by_skill':
                    return await this.findEmployeesBySkill(args);
                case 'find_employees_by_department':
                    return await this.findEmployeesByDepartment(args);
                case 'find_company':
                    return await this.findCompany(args);
                case 'find_position':
                    return await this.findPosition(args);
                case 'find_technology':
                    return await this.findTechnology(args);
                case 'find_location':
                    return await this.findLocation(args);
                case 'find_unit':
                    return await this.findUnit(args);
                default:
                    throw new Error(`Unknown function: ${functionName}`);
            }
        }
        catch (error) {
            this.logger.error(`Error executing function ${functionName}:`, error);
            throw error;
        }
    }
    async searchEmployees(args) {
        const limit = args.limit || 10;
        try {
            if (args.name) {
                return await this.employeesService.findByName(args.name, 0, limit);
            }
            if (args.department) {
                return await this.employeesService.findByDepartment(args.department, 0, limit);
            }
            if (args.skill) {
                return await this.employeesService.findBySkill(args.skill, 0, limit);
            }
            if (args.position) {
                return await this.employeesService.findByPosition(args.position, 0, limit);
            }
            if (args.project) {
                return await this.employeesService.findByProject(args.project, 0, limit);
            }
            return await this.employeesService.list(0, limit);
        }
        catch (error) {
            this.logger.error('Search employees error:', error);
            throw error;
        }
    }
    async getEmployeeDetails(args) {
        if (!args.empId) {
            throw new Error('empId is required');
        }
        return await this.employeesService.get(args.empId);
    }
    async listDepartments(args) {
        const results = await this.departmentsService.list();
        const limit = args.limit || 20;
        return results.slice(0, limit);
    }
    async listProjects(args) {
        const results = await this.projectsService.list();
        const limit = args.limit || 20;
        return results.slice(0, limit);
    }
    async listSkills(args) {
        const results = await this.skillsService.list();
        const limit = args.limit || 20;
        return results.slice(0, limit);
    }
    async getAggregateStats() {
        const [employees, departments, projects, skills] = await Promise.all([
            this.employeesService.list(),
            this.departmentsService.list(),
            this.projectsService.list(),
            this.skillsService.list(),
        ]);
        return {
            totalEmployees: employees.length,
            totalDepartments: departments.length,
            totalProjects: projects.length,
            totalSkills: skills.length,
            departments: departments.map((d) => ({
                name: d.name,
                code: d.code,
            })),
        };
    }
    async findEmployeesBySkill(args) {
        if (!args.skill) {
            throw new Error('skill is required');
        }
        const limit = args.limit || 10;
        return await this.employeesService.findBySkill(args.skill, 0, limit);
    }
    async findEmployeesByDepartment(args) {
        if (!args.department) {
            throw new Error('department is required');
        }
        const limit = args.limit || 10;
        return await this.employeesService.findByDepartment(args.department, 0, limit);
    }
    async findCompany(args) {
        try {
            return await this.companiesService.findByName(args.name);
        }
        catch (error) {
            this.logger.error('Find company error:', error);
            throw error;
        }
    }
    async findPosition(args) {
        try {
            return await this.positionsService.findByName(args.name);
        }
        catch (error) {
            this.logger.error('Find position error:', error);
            throw error;
        }
    }
    async findTechnology(args) {
        try {
            return await this.technologiesService.findByName(args.name);
        }
        catch (error) {
            this.logger.error('Find technology error:', error);
            throw error;
        }
    }
    async findLocation(args) {
        try {
            return await this.locationsService.findByName(args.name);
        }
        catch (error) {
            this.logger.error('Find location error:', error);
            throw error;
        }
    }
    async findUnit(args) {
        try {
            return await this.unitsService.findByName(args.name);
        }
        catch (error) {
            this.logger.error('Find unit error:', error);
            throw error;
        }
    }
    static getToolDefinitions() {
        return [
            {
                name: 'search_employees',
                description: 'Tìm kiếm nhân viên theo TÊN (họ tên), phòng ban, kỹ năng, chức danh, hoặc dự án. ' +
                    'Sử dụng khi user hỏi về DANH SÁCH nhân viên hoặc TÌM nhân viên theo TÊN. ' +
                    'VÍ DỤ: "nhân viên tên Nguyễn Văn A", "danh sách nhân viên phòng Backend", "ai biết React". ' +
                    'KHÔNG dùng cho: công nghệ (dùng find_technology), công ty (dùng find_company).',
                parameters: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'HỌ TÊN nhân viên để tìm kiếm (ví dụ: "Bùi Gia Bảo", "Nguyễn Văn A", "Trần Thị B"). ' +
                                'Dùng khi user hỏi "nhân viên tên X", "id của X", "thông tin về X" (X là TÊN NGƯỜI).',
                        },
                        department: {
                            type: 'string',
                            description: 'Tên phòng ban (ví dụ: "Backend", "Frontend", "Marketing")',
                        },
                        skill: {
                            type: 'string',
                            description: 'Tên kỹ năng (ví dụ: "Python", "React", "Java")',
                        },
                        position: {
                            type: 'string',
                            description: 'Chức danh (ví dụ: "Senior Developer", "Manager")',
                        },
                        project: {
                            type: 'string',
                            description: 'Tên hoặc mã dự án',
                        },
                        limit: {
                            type: 'number',
                            description: 'Số lượng kết quả tối đa (mặc định 10)',
                        },
                    },
                },
            },
            {
                name: 'get_employee_details',
                description: 'Lấy thông tin chi tiết của một nhân viên cụ thể theo MÃ NHÂN VIÊN (empId). ' +
                    'CHỈ dùng khi user cung cấp MÃ NHÂN VIÊN (ví dụ: "NV001", "EMP_123"). ' +
                    'KHÔNG dùng khi user hỏi theo TÊN (dùng search_employees thay thế).',
                parameters: {
                    type: 'object',
                    properties: {
                        empId: {
                            type: 'string',
                            description: 'MÃ NHÂN VIÊN (ví dụ: "NV001", "EMP_FE_001"). KHÔNG phải tên người.',
                        },
                    },
                    required: ['empId'],
                },
            },
            {
                name: 'list_departments',
                description: 'Liệt kê tất cả phòng ban trong hệ thống',
                parameters: {
                    type: 'object',
                    properties: {
                        limit: {
                            type: 'number',
                            description: 'Số lượng kết quả tối đa',
                        },
                    },
                },
            },
            {
                name: 'list_projects',
                description: 'Liệt kê tất cả dự án trong hệ thống',
                parameters: {
                    type: 'object',
                    properties: {
                        limit: {
                            type: 'number',
                            description: 'Số lượng kết quả tối đa',
                        },
                    },
                },
            },
            {
                name: 'list_skills',
                description: 'Liệt kê tất cả kỹ năng trong hệ thống',
                parameters: {
                    type: 'object',
                    properties: {
                        limit: {
                            type: 'number',
                            description: 'Số lượng kết quả tối đa',
                        },
                    },
                },
            },
            {
                name: 'aggregate_stats',
                description: 'Lấy thống kê tổng hợp về hệ thống (tổng số nhân viên, phòng ban, dự án, kỹ năng)',
                parameters: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'find_company',
                description: 'Tìm CÔNG TY theo tên hoặc mã. Trả về thông tin chi tiết của công ty (tên, lĩnh vực, số nhân sự, ngày thành lập). ' +
                    'VÍ DỤ: "công ty APTX", "thông tin về công ty X". ' +
                    'KHÔNG dùng cho nhân viên (dùng search_employees).',
                parameters: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Tên công ty hoặc mã công ty (ví dụ: "APTX", "Công ty APTX")',
                        },
                    },
                    required: ['name'],
                },
            },
            {
                name: 'find_position',
                description: 'Tìm CHỨC DANH theo tên. Trả về thông tin chi tiết về chức danh (tên, cấp bậc, nhóm nghề, mô tả). ' +
                    'VÍ DỤ: "chức danh Frontend Developer", "Mid là gì".',
                parameters: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Tên chức danh (ví dụ: "Frontend Developer", "Mid")',
                        },
                    },
                    required: ['name'],
                },
            },
            {
                name: 'find_technology',
                description: 'Tìm CÔNG NGHỆ/FRAMEWORK/LIBRARY theo tên. Trả về thông tin về công nghệ (tên, loại, mô tả). ' +
                    'VÍ DỤ: "Tailwind CSS là gì", "React dùng để làm gì", "thông tin về Node.js". ' +
                    'KHÔNG dùng cho nhân viên (dùng search_employees), không dùng cho kỹ năng của nhân viên.',
                parameters: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Tên công nghệ (ví dụ: "Tailwind CSS", "React", "Node.js", "Python", "Java")',
                        },
                    },
                    required: ['name'],
                },
            },
            {
                name: 'find_location',
                description: 'Tìm địa điểm theo tên. Trả về thông tin chi tiết về địa điểm (tên, địa chỉ, thành phố, quốc gia, tọa độ).',
                parameters: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Tên địa điểm (ví dụ: "Văn phòng APTX", "HCM", "Hutech Tower")',
                        },
                    },
                    required: ['name'],
                },
            },
            {
                name: 'find_unit',
                description: 'Tìm đơn vị kinh doanh theo tên. Trả về thông tin về đơn vị (tên, loại, số phòng ban, mô tả).',
                parameters: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Tên đơn vị (ví dụ: "Khối Kinh doanh", "Khối Công nghệ")',
                        },
                    },
                    required: ['name'],
                },
            },
        ];
    }
};
exports.FunctionCallingService = FunctionCallingService;
exports.FunctionCallingService = FunctionCallingService = FunctionCallingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [employees_service_1.EmployeesService,
        departments_service_1.DepartmentsService,
        projects_service_1.ProjectsService,
        skills_service_1.SkillsService,
        companies_service_1.CompaniesService,
        positions_service_1.PositionsService,
        technologies_service_1.TechnologiesService,
        locations_service_1.LocationsService,
        units_service_1.UnitsService])
], FunctionCallingService);
//# sourceMappingURL=function-calling.service.js.map