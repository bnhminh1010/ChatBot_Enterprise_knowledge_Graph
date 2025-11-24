import { Injectable, Logger } from '@nestjs/common';
import { EmployeesService } from '../employees/employees.service';
import { DepartmentsService } from '../departments/departments.service';
import { ProjectsService } from '../projects/projects.service';
import { SkillsService } from '../skills/skills.service';
import { CompaniesService } from '../companies/companies.service';
import { PositionsService } from '../positions/positions.service';
import { TechnologiesService } from '../technologies/technologies.service';
import { LocationsService } from '../locations/locations.service';
import { UnitsService } from '../units/units.service';

/**
 * Function Calling Service
 * Handles function calls from Gemini AI to access Neo4j data
 */
@Injectable()
export class FunctionCallingService {
  private readonly logger = new Logger(FunctionCallingService.name);

  constructor(
    private employeesService: EmployeesService,
    private departmentsService: DepartmentsService,
    private projectsService: ProjectsService,
    private skillsService: SkillsService,
    // NEW: Entity search services
    private companiesService: CompaniesService,
    private positionsService: PositionsService,
    private technologiesService: TechnologiesService,
    private locationsService: LocationsService,
    private unitsService: UnitsService,
  ) {}

  /**
   * Execute a function call from Gemini
   */
  async executeFunctionCall(functionName: string, args: any): Promise<any> {
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

        // NEW: Entity search tools
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
    } catch (error) {
      this.logger.error(`Error executing function ${functionName}:`, error);
      throw error;
    }
  }

  /**
   * Search employees with flexible filters
   * NEW: Added 'name' parameter for searching by employee name
   */
  async searchEmployees(args: {
    name?: string; // NEW: Search by name
    department?: string;
    skill?: string;
    position?: string;
    project?: string;
    limit?: number;
  }) {
    const limit = args.limit || 10;

    try {
      // NEW: If name specified, search by name first
      if (args.name) {
        return await this.employeesService.findByName(args.name, 0, limit);
      }

      if (args.department) {
        return await this.employeesService.findByDepartment(
          args.department,
          0,
          limit,
        );
      }

      if (args.skill) {
        return await this.employeesService.findBySkill(args.skill, 0, limit);
      }

      if (args.position) {
        return await this.employeesService.findByPosition(
          args.position,
          0,
          limit,
        );
      }

      if (args.project) {
        return await this.employeesService.findByProject(
          args.project,
          0,
          limit,
        );
      }

      // Default: list all
      return await this.employeesService.list(0, limit);
    } catch (error) {
      this.logger.error('Search employees error:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about an employee
   */
  async getEmployeeDetails(args: { empId: string }) {
    if (!args.empId) {
      throw new Error('empId is required');
    }
    return await this.employeesService.get(args.empId);
  }

  /**
   * List all departments
   */
  async listDepartments(args: { limit?: number }) {
    const results = await this.departmentsService.list();
    const limit = args.limit || 20;
    return results.slice(0, limit);
  }

  /**
   * List all projects
   */
  async listProjects(args: { limit?: number }) {
    const results = await this.projectsService.list();
    const limit = args.limit || 20;
    return results.slice(0, limit);
  }

  /**
   * List all skills
   */
  async listSkills(args: { limit?: number }) {
    const results = await this.skillsService.list();
    const limit = args.limit || 20;
    return results.slice(0, limit);
  }

  /**
   * Get aggregate statistics
   */
  async getAggregateStats() {
    const [employees, departments, projects, skills] = await Promise.all([
      this.employeesService.list(), // Get all
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

  /**
   * Find employees by skill (dedicated method for clarity)
   */
  async findEmployeesBySkill(args: { skill: string; limit?: number }) {
    if (!args.skill) {
      throw new Error('skill is required');
    }
    const limit = args.limit || 10;
    return await this.employeesService.findBySkill(args.skill, 0, limit);
  }

  /**
   * Find employees by department (dedicated method for clarity)
   */
  async findEmployeesByDepartment(args: {
    department: string;
    limit?: number;
  }) {
    if (!args.department) {
      throw new Error('department is required');
    }
    const limit = args.limit || 10;
    return await this.employeesService.findByDepartment(
      args.department,
      0,
      limit,
    );
  }

  // ==================== NEW: ENTITY SEARCH METHODS ====================

  /**
   * Find company by name
   */
  async findCompany(args: { name: string }) {
    try {
      return await this.companiesService.findByName(args.name);
    } catch (error) {
      this.logger.error('Find company error:', error);
      throw error;
    }
  }

  /**
   * Find position by name
   */
  async findPosition(args: { name: string }) {
    try {
      return await this.positionsService.findByName(args.name);
    } catch (error) {
      this.logger.error('Find position error:', error);
      throw error;
    }
  }

  /**
   * Find technology by name
   */
  async findTechnology(args: { name: string }) {
    try {
      return await this.technologiesService.findByName(args.name);
    } catch (error) {
      this.logger.error('Find technology error:', error);
      throw error;
    }
  }

  /**
   * Find location by name
   */
  async findLocation(args: { name: string }) {
    try {
      return await this.locationsService.findByName(args.name);
    } catch (error) {
      this.logger.error('Find location error:', error);
      throw error;
    }
  }

  /**
   * Find unit by name
   */
  async findUnit(args: { name: string }) {
    try {
      return await this.unitsService.findByName(args.name);
    } catch (error) {
      this.logger.error('Find unit error:', error);
      throw error;
    }
  }

  /**
   * Get tool definitions for Gemini
   * These are the "tools" that Gemini can call
   */
  static getToolDefinitions() {
    return [
      {
        name: 'search_employees',
        description:
          'Tìm kiếm nhân viên theo TÊN (họ tên), phòng ban, kỹ năng, chức danh, hoặc dự án. ' +
          'Sử dụng khi user hỏi về DANH SÁCH nhân viên hoặc TÌM nhân viên theo TÊN. ' +
          'VÍ DỤ: "nhân viên tên Nguyễn Văn A", "danh sách nhân viên phòng Backend", "ai biết React". ' +
          'KHÔNG dùng cho: công nghệ (dùng find_technology), công ty (dùng find_company).',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description:
                'HỌ TÊN nhân viên để tìm kiếm (ví dụ: "Bùi Gia Bảo", "Nguyễn Văn A", "Trần Thị B"). ' +
                'Dùng khi user hỏi "nhân viên tên X", "id của X", "thông tin về X" (X là TÊN NGƯỜI).',
            },
            department: {
              type: 'string',
              description:
                'Tên phòng ban (ví dụ: "Backend", "Frontend", "Marketing")',
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
        description:
          'Lấy thông tin chi tiết của một nhân viên cụ thể theo MÃ NHÂN VIÊN (empId). ' +
          'CHỈ dùng khi user cung cấp MÃ NHÂN VIÊN (ví dụ: "NV001", "EMP_123"). ' +
          'KHÔNG dùng khi user hỏi theo TÊN (dùng search_employees thay thế).',
        parameters: {
          type: 'object',
          properties: {
            empId: {
              type: 'string',
              description:
                'MÃ NHÂN VIÊN (ví dụ: "NV001", "EMP_FE_001"). KHÔNG phải tên người.',
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
        description:
          'Lấy thống kê tổng hợp về hệ thống (tổng số nhân viên, phòng ban, dự án, kỹ năng)',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      // NEW: Entity search tools
      {
        name: 'find_company',
        description:
          'Tìm CÔNG TY theo tên hoặc mã. Trả về thông tin chi tiết của công ty (tên, lĩnh vực, số nhân sự, ngày thành lập). ' +
          'VÍ DỤ: "công ty APTX", "thông tin về công ty X". ' +
          'KHÔNG dùng cho nhân viên (dùng search_employees).',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description:
                'Tên công ty hoặc mã công ty (ví dụ: "APTX", "Công ty APTX")',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'find_position',
        description:
          'Tìm CHỨC DANH theo tên. Trả về thông tin chi tiết về chức danh (tên, cấp bậc, nhóm nghề, mô tả). ' +
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
        description:
          'Tìm CÔNG NGHỆ/FRAMEWORK/LIBRARY theo tên. Trả về thông tin về công nghệ (tên, loại, mô tả). ' +
          'VÍ DỤ: "Tailwind CSS là gì", "React dùng để làm gì", "thông tin về Node.js". ' +
          'KHÔNG dùng cho nhân viên (dùng search_employees), không dùng cho kỹ năng của nhân viên.',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description:
                'Tên công nghệ (ví dụ: "Tailwind CSS", "React", "Node.js", "Python", "Java")',
            },
          },
          required: ['name'],
        },
      },

      {
        name: 'find_location',
        description:
          'Tìm địa điểm theo tên. Trả về thông tin chi tiết về địa điểm (tên, địa chỉ, thành phố, quốc gia, tọa độ).',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description:
                'Tên địa điểm (ví dụ: "Văn phòng APTX", "HCM", "Hutech Tower")',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'find_unit',
        description:
          'Tìm đơn vị kinh doanh theo tên. Trả về thông tin về đơn vị (tên, loại, số phòng ban, mô tả).',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description:
                'Tên đơn vị (ví dụ: "Khối Kinh doanh", "Khối Công nghệ")',
            },
          },
          required: ['name'],
        },
      },
    ];
  }
}
