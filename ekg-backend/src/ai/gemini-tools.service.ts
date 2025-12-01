import { Injectable, Logger } from '@nestjs/common';
import { PositionsService } from '../positions/positions.service';
import { TechnologiesService } from '../technologies/technologies.service';
import { EmployeesService } from '../employees/employees.service';
import { DepartmentsService } from '../departments/departments.service';
import { ProjectsService } from '../projects/projects.service';
import { SkillsService } from '../skills/skills.service';
import { DocumentsService } from '../documents/documents.service';
import { ChromaDBService } from './chroma-db.service';

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
    private readonly chromaDBService: ChromaDBService,
  ) {}

  getTools(): ToolDefinition[] {
    return [
      // ⚡ UNIVERSAL SEARCH - Dùng trước tiên
      ...this.getUniversalTools(),
      // Specific tools (backup)
      ...this.getEmployeeTools(),
      ...this.getPositionTools(),
      ...this.getDepartmentTools(),
      ...this.getProjectTools(),
      ...this.getTechnologyTools(),
      ...this.getSkillTools(),
      ...this.getDocumentTools(),
    ];
  }

  /**
   * 🚀 UNIVERSAL SEARCH TOOL
   * Vector search qua TẤT CẢ data - agent tự generate query
   */
  private getUniversalTools(): ToolDefinition[] {
    return [
      {
        name: 'universal_search',
        description:
          '🌟 UNIVERSAL VECTOR SEARCH - TÌM BẤT KỲ THÔNG TIN GÌ trong hệ thống. ' +
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
              description:
                'Free-form search query (tiếng Anh hoặc Việt). Agent TỰ NGHĨ RA query tốt nhất dựa trên câu hỏi của user. Include keywords, context, mô tả chi tiết.',
            },
            limit: {
              type: 'number',
              description: 'Số kết quả tối đa (default: 10)',
            },
          },
          required: ['query'],
        },
      },
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
          'Lấy NỘI DUNG tài liệu theo ID. ' +
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
      {
        name: 'search_documents',
        description:
          '🔍 **PRIMARY TOOL FOR DOCUMENTS** - TÌM KIẾM tài liệu theo TÊN (không cần ID). ' +
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
              description:
                'TÊN tài liệu để tìm. Extract từ câu hỏi của user (ví dụ: user nói "lấy tài liệu thiết kế" → documentName="thiết kế")',
            },
            projectId: {
              type: 'string',
              description:
                'ID dự án (OPTIONAL). Chỉ điền nếu user EXPLICITLY nói tên dự án cụ thể.',
            },
          },
          required: ['documentName'],
        },
      },
    ];
  }

  async executeTool(name: string, args: any): Promise<any> {
    this.logger.log(
      `🔧 Executing tool: ${name} with args: ${JSON.stringify(args)}`,
    );
    try {
      // ⚡ UNIVERSAL SEARCH - ChromaDB Vector Search
      if (name === 'universal_search') {
        const query = args.query;
        const limit = args.limit || 10;

        this.logger.log(`🌟 Universal search: "${query}" (limit: ${limit})`);

        // Search across ALL collections in ChromaDB
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

        // Flatten and combine results
        const allResults = results
          .flat()
          .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
          .slice(0, limit);

        this.logger.log(
          `✅ Found ${allResults.length} results via vector search`,
        );

        return {
          data: allResults,
          total: allResults.length,
          message: `Tìm thấy ${allResults.length} kết quả cho "${query}"`,
        };
      }

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
        // Support both project-based and direct document access
        let result;
        if (args.projectId) {
          // Project document
          result = await this.documentsService.getDocumentContent(
            args.projectId,
            args.docId,
          );
        } else {
          // Company document (no project)
          result = await this.documentsService.getDocumentContentDirect(
            args.docId,
          );
        }
        
        // Format response: return text content with metadata
        const contentPreview =
          result.content.length > 1000
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
        const result = await this.documentsService.getProjectDocuments(
          args.projectId,
        );
        return { data: result };
      }

      // Search documents by name
      if (name === 'search_documents') {
        const results = await this.documentsService.searchDocumentsByName(
          args.documentName,
          args.projectId,
        );

        if (results.length === 0) {
          return {
            found: false,
            count: 0,
            message: `Không tìm thấy tài liệu nào có tên chứa "${args.documentName}". Hãy thử tên khác hoặc liệt kê tất cả tài liệu.`,
          };
        }

        if (results.length === 1) {
          // Chỉ 1 kết quả → gợi ý lấy ngay
          const doc = results[0];
          const hasProject = (doc as any).projectId && (doc as any).projectId !== 'unknown';
          return {
            found: true,
            count: 1,
            autoSelect: true,
            document: {
              id: doc.id,
              name: doc.name,
              description: doc.mo_ta,
              projectId: (doc as any).projectId || null,
              type: doc.loai,
              hasPath: doc.co_duong_dan,
            },
            message: `Tìm thấy tài liệu: "${doc.name}" (ID: ${doc.id}). Đang lấy nội dung...`,
            nextAction: hasProject 
              ? `Gọi get_document_content với docId="${doc.id}" và projectId="${(doc as any).projectId}"`
              : `Gọi get_document_content với docId="${doc.id}" (company document, không cần projectId)`,
          };
        }

        // Nhiều kết quả → show list
        return {
          found: true,
          count: results.length,
          documents: results.map((doc, index) => ({
            index: index + 1,
            id: doc.id,
            name: doc.name,
            description: doc.mo_ta,
            projectId: (doc as any).projectId || 'unknown',
            type: doc.loai,
            hasPath: doc.co_duong_dan,
          })),
          message: `Tìm thấy ${results.length} tài liệu phù hợp với "${args.documentName}". Vui lòng chọn tài liệu bạn muốn xem.`,
        };
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
