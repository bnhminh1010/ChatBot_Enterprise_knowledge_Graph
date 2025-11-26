import { Injectable, Logger } from '@nestjs/common';
import { PositionsService } from '../positions/positions.service';
import { TechnologiesService } from '../technologies/technologies.service';
import { EmployeesService } from '../employees/employees.service';
import { DepartmentsService } from '../departments/departments.service';
import { ProjectsService } from '../projects/projects.service';
import { SkillsService } from '../skills/skills.service';
import { DocumentsService } from '../documents/documents.service';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

@Injectable()
export class GeminiToolsService {
  private readonly logger = new Logger(GeminiToolsService.name);

  constructor(
    private readonly positionsService: PositionsService,
    private readonly technologiesService: TechnologiesService,
    private readonly employeesService: EmployeesService,
    private readonly departmentsService: DepartmentsService,
    private readonly projectsService: ProjectsService,
    private readonly skillsService: SkillsService,
    private readonly documentsService: DocumentsService,
  ) { }

  getTools(): ToolDefinition[] {
    return [
      ...this.getEmployeeTools(),
      ...this.getPositionTools(),
      ...this.getDepartmentTools(),
      ...this.getProjectTools(),
      ...this.getTechnologyTools(),
      ...this.getSkillTools(),
      ...this.getDocumentTools(),
    ];
  }

  private getEmployeeTools(): ToolDefinition[] {
    return [
      {
        name: 'search_employees_by_name',
        description:
          'Tìm nhân viên theo tên. USE THIS when: tìm nhân viên tên X. Keywords: tên, họ tên, name',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Tên nhân viên' },
          },
        },
      },
      {
        name: 'search_employees_by_level',
        description:
          'Tìm nhân viên theo cấp bậc hiện tại. USE THIS when: nhân viên cấp bậc Staff. Keywords: cấp bậc hiện tại, level',
        parameters: {
          type: 'object',
          properties: { level: { type: 'string', description: 'Cấp bậc' } },
        },
      },
      {
        name: 'search_employees_by_email',
        description:
          'Tìm nhân viên theo email. USE THIS when: email @company.com. Keywords: email',
        parameters: {
          type: 'object',
          properties: { email: { type: 'string', description: 'Email' } },
        },
      },
      {
        name: 'search_employees_by_phone',
        description:
          'Tìm nhân viên theo số điện thoại. USE THIS when: số điện thoại 090. Keywords: phone, sđt',
        parameters: {
          type: 'object',
          properties: {
            phone: { type: 'string', description: 'Số điện thoại' },
          },
        },
      },
      {
        name: 'search_employees_by_status',
        description:
          'Tìm nhân viên theo trạng thái. USE THIS when: nhân viên active. Keywords: trạng thái, status',
        parameters: {
          type: 'object',
          properties: { status: { type: 'string', description: 'Trạng thái' } },
        },
      },
      {
        name: 'get_employee_by_id',
        description:
          'Lấy chi tiết nhân viên theo ID. USE THIS when: chi tiết nhân viên NS001. Keywords: chi tiết, ID',
        parameters: {
          type: 'object',
          properties: { id: { type: 'string', description: 'ID' } },
          required: ['id'],
        },
      },
      {
        name: 'count_employees',
        description:
          'Đếm tổng số nhân viên. USE THIS when: có bao nhiêu nhân viên, số lượng nhân viên. Keywords: đếm, tổng số, bao nhiêu, count',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'search_employees_by_department',
        description:
          'Tìm nhân viên trong phòng ban cụ thể. USE THIS when: nhân viên phòng IT, ai làm ở Marketing. Keywords: phòng ban, department',
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
        description:
          'Tìm kiếm nhân viên nâng cao theo nhiều tiêu chí (phòng ban, chức danh, kỹ năng, dự án). USE THIS when: Senior Engineer phòng Backend, ai biết React và làm dự án X. Keywords: phòng ban, chức danh, kỹ năng, dự án',
        parameters: {
          type: 'object',
          properties: {
            department: { type: 'string', description: 'Phòng ban' },
            position: { type: 'string', description: 'Chức danh/Vị trí' },
            skill: { type: 'string', description: 'Kỹ năng' },
            level: { type: 'string', description: 'Cấp bậc' },
            project: { type: 'string', description: 'Dự án' },
          },
        },
      },
    ];
  }

  private getPositionTools(): ToolDefinition[] {
    return [
      {
        name: 'search_positions_by_name',
        description:
          'Tìm chức danh theo tên. USE THIS when: chức danh Engineer. Keywords: chức danh',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Tên chức danh' },
          },
        },
      },
      {
        name: 'search_positions_by_level',
        description:
          'Tìm chức danh theo cấp bậc. USE THIS when: chức danh cấp bậc Staff. Keywords: chức danh cấp bậc',
        parameters: {
          type: 'object',
          properties: { level: { type: 'string', description: 'Cấp bậc' } },
        },
      },
      {
        name: 'search_positions_by_group',
        description:
          'Tìm chức danh theo nhóm nghề. USE THIS when: nhóm nghề Engineering. Keywords: nhóm nghề',
        parameters: {
          type: 'object',
          properties: { group: { type: 'string', description: 'Nhóm nghề' } },
        },
      },
      {
        name: 'count_positions',
        description:
          'Đếm tổng số chức danh. USE THIS when: có bao nhiêu chức danh, số lượng vị trí. Keywords: đếm, tổng số',
        parameters: { type: 'object', properties: {} },
      },
    ];
  }

  private getDepartmentTools(): ToolDefinition[] {
    return [
      {
        name: 'search_departments_by_name',
        description:
          'Tìm phòng ban theo tên. USE THIS when: phòng ban Frontend. Keywords: phòng ban',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Tên phòng ban' },
          },
        },
      },
      {
        name: 'search_departments_by_code',
        description:
          'Tìm phòng ban theo mã. USE THIS when: mã phòng ban PB-IT. Keywords: mã phòng ban',
        parameters: {
          type: 'object',
          properties: { code: { type: 'string', description: 'Mã phòng ban' } },
        },
      },
      {
        name: 'get_department_by_id',
        description:
          'Lấy chi tiết phòng ban theo ID. USE THIS when: chi tiết phòng ban PB001. Keywords: chi tiết',
        parameters: {
          type: 'object',
          properties: { id: { type: 'string', description: 'ID' } },
          required: ['id'],
        },
      },
      {
        name: 'count_departments',
        description:
          'Đếm tổng số phòng ban. USE THIS when: có bao nhiêu phòng ban, số lượng phòng ban. Keywords: đếm, tổng số',
        parameters: { type: 'object', properties: {} },
      },
    ];
  }

  private getProjectTools(): ToolDefinition[] {
    return [
      {
        name: 'search_projects_by_client',
        description:
          'Tìm dự án theo khách hàng. USE THIS when: dự án khách hàng VinGroup. Keywords: khách hàng',
        parameters: {
          type: 'object',
          properties: { client: { type: 'string', description: 'Khách hàng' } },
        },
      },
      {
        name: 'search_projects_by_status',
        description:
          'Tìm dự án theo trạng thái. USE THIS when: dự án In Progress. Keywords: trạng thái dự án',
        parameters: {
          type: 'object',
          properties: { status: { type: 'string', description: 'Trạng thái' } },
        },
      },
      {
        name: 'search_projects_by_field',
        description:
          'Tìm dự án theo lĩnh vực. USE THIS when: dự án lĩnh vực Fintech. Keywords: lĩnh vực',
        parameters: {
          type: 'object',
          properties: { field: { type: 'string', description: 'Lĩnh vực' } },
        },
      },
      {
        name: 'search_projects_by_type',
        description:
          'Tìm dự án theo loại. USE THIS when: dự án loại Internal. Keywords: loại dự án',
        parameters: {
          type: 'object',
          properties: { type: { type: 'string', description: 'Loại' } },
        },
      },
      {
        name: 'get_project_by_id',
        description:
          'Lấy chi tiết dự án theo ID. USE THIS when: chi tiết dự án DA001. Keywords: chi tiết',
        parameters: {
          type: 'object',
          properties: { id: { type: 'string', description: 'ID' } },
          required: ['id'],
        },
      },
      {
        name: 'count_projects',
        description:
          'Đếm tổng số dự án. USE THIS when: có bao nhiêu dự án, số lượng project. Keywords: đếm, tổng số',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'get_project_manager',
        description:
          'Tìm người quản lý (PM) của dự án. USE THIS when: ai quản lý dự án X, PM của dự án Y. Keywords: quản lý, PM, manager',
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

  private getTechnologyTools(): ToolDefinition[] {
    return [
      {
        name: 'search_technologies_by_name',
        description:
          'Tìm công nghệ theo tên. USE THIS when: công nghệ React. Keywords: công nghệ',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Tên công nghệ' },
          },
        },
      },
      {
        name: 'search_technologies_by_type',
        description:
          'Tìm công nghệ theo loại. USE THIS when: công nghệ loại Framework. Keywords: loại công nghệ',
        parameters: {
          type: 'object',
          properties: { type: { type: 'string', description: 'Loại' } },
        },
      },
      {
        name: 'count_technologies',
        description:
          'Đếm tổng số công nghệ. USE THIS when: có bao nhiêu công nghệ, số lượng technology. Keywords: đếm, tổng số',
        parameters: { type: 'object', properties: {} },
      },
    ];
  }

  private getSkillTools(): ToolDefinition[] {
    return [
      {
        name: 'list_skills',
        description:
          '⚠️ LIST ALL SKILLS ⚠️ Use THIS tool when user asks: "danh sách kỹ năng", "tất cả kỹ năng", "có những kỹ năng gì", "liệt kê kỹ năng", "skill list". Returns: Array of ALL skill objects {id, name, category}. NO LIMIT. IMPORTANT: This tool lists SKILLS ONLY, NOT employees. DO NOT use search_employees tools when user asks for skill list.',
        parameters: { type: 'object', properties: {} },
      },
    ];
  }

  private getDocumentTools(): ToolDefinition[] {
    return [
      {
        name: 'get_document_content',
        description:
          'Lấy nội dung TÀI LIỆU theo ID tài liệu và ID dự án. USE THIS when: lấy tài liệu TL002, nội dung tài liệu, đọc file doc. Keywords: tài liệu, document, nội dung, content',
        parameters: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'ID của dự án (ví dụ: "DuAn_test_001")',
            },
            docId: {
              type: 'string',
              description: 'ID của tài liệu (ví dụ: "TL002")',
            },
          },
          required: ['projectId', 'docId'],
        },
      },
      {
        name: 'list_project_documents',
        description:
          'Liệt kê tất cả TÀI LIỆU của một dự án. USE THIS when: danh sách tài liệu, dự án có tài liệu gì, liệt kê file. Keywords: danh sách tài liệu, tài liệu dự án',
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
    ];
  }

  async executeTool(name: string, args: any): Promise<any> {
    this.logger.log(
      `🔧 Executing tool: ${name} with args: ${JSON.stringify(args)}`,
    );
    try {
      // Employee tools (7 tools)
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
        const result = await this.employeesService.findByDepartment(
          args.department,
        );
        return { data: result };
      }
      if (name === 'search_employees_advanced') {
        const result = await this.employeesService.findByCriteria(args);
        return { data: result };
      }

      // Position tools (4 tools)
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

      // Department tools (4 tools)
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

      // Project tools (6 tools)
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
        const result = await this.projectsService.getProjectManager(
          args.projectName,
        );
        if (!result)
          return {
            message: `Không tìm thấy người quản lý cho dự án "${args.projectName}"`,
          };
        return { data: result };
      }

      // Technology tools (3 tools)
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

      // Skill tools (1 tool)
      if (name === 'list_skills') {
        const result = await this.skillsService.list();
        return { data: result };
      }

      // Document tools (2 tools)
      if (name === 'get_document_content') {
        const result = await this.documentsService.getDocumentContent(
          args.projectId,
          args.docId,
        );
        // Format response: return text content with metadata
        const contentPreview = result.content.length > 1000
          ? result.content.substring(0, 1000) + '...(đã cắt bớt)'
          : result.content;

        return {
          documentName: result.documentName,
          documentType: result.documentType,
          fileType: result.fileInfo.type,
          contentLength: result.content.length,
          content: contentPreview,
          message: `Tài liệu "${result.documentName}" (${result.fileInfo.type}, ${result.fileInfo.size} bytes)`,
        };
      }
      if (name === 'list_project_documents') {
        const result = await this.documentsService.getProjectDocuments(
          args.projectId,
        );
        return { data: result };
      }

      return { error: `Tool ${name} not found` };
    } catch (error) {
      this.logger.error(`Tool execution error: ${error}`);
      return {
        error: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
