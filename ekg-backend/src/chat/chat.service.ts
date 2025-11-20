import { Injectable, Logger } from '@nestjs/common';
import { QueryClassifierService } from '../ai/query-classifier.service';
import { OllamaService } from '../ai/ollama.service';
import { ChromaDBService } from '../ai/chroma-db.service';
import { GeminiService } from '../ai/gemini.service';

// Import existing services
import { EmployeesService } from '../employees/employees.service';
import { SkillsService } from '../skills/skills.service';
import { DepartmentsService } from '../departments/departments.service';
import { ProjectsService } from '../projects/projects.service';
import { SearchService } from '../search/search.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private queryClassifier: QueryClassifierService,
    private ollamaService: OllamaService,
    private chromaDBService: ChromaDBService,
    private geminiService: GeminiService,
    private employeesService: EmployeesService,
    private skillsService: SkillsService,
    private departmentsService: DepartmentsService,
    private projectsService: ProjectsService,
    private searchService: SearchService,
  ) {}

  /**
   * Xử lý user query và trả về response
   */
  async processQuery(message: string): Promise<{
    response: string;
    queryType: string;
    queryLevel: 'simple' | 'medium' | 'complex';
    processingTime: number;
  }> {
    const startTime = Date.now();

    try {
      // Bước 1: Phân loại query
      const classified = this.queryClassifier.classifyQuery(message);
      this.logger.debug(`Query classified: ${classified.type} (${classified.level})`);

      let response = '';

      // Bước 2: Xử lý theo level
      switch (classified.level) {
        case 'simple':
          response = await this.handleSimpleQuery(classified.type, classified.value);
          break;

        case 'medium':
          response = await this.handleMediumQuery(classified.type, classified.value, message);
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
    } catch (error) {
      this.logger.error(`Error processing query: ${error}`);
      const processingTime = Date.now() - startTime;
      
      // Xử lý lỗi database connection
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Kiểm tra nếu là lỗi database connection
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

  /**
   * Xử lý simple queries (dùng Neo4j)
   */
  private async handleSimpleQuery(type: string, value?: string): Promise<string> {
    try {
      switch (type) {
        case 'list-employees': {
          const employees = await this.employeesService.list();
          if (employees.length === 0) {
            return 'Không có nhân viên nào trong hệ thống.';
          }
          const list = employees
            .slice(0, 10)
            .map((emp: any) => `• ${emp.name} - ${emp.position || 'Chưa xác định'}`)
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
            .map((dept: any) => `• ${dept.name}`)
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
            .map((skill: any) => `• ${skill.name}`)
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
            .map((proj: any) => `• ${proj.name} - ${proj.status || 'Chưa xác định'}`)
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
            .map((r: any) => `• ${r.name} (${r.type})`)
            .join('\n');
          return `Kết quả tìm kiếm cho "${value}" (${results.length}):\n${list}${results.length > 10 ? '\n... và ' + (results.length - 10) + ' kết quả khác' : ''}`;
        }

        case 'get-employee': {
          const employees = await this.employeesService.list();
          const found = employees.filter((e: any) =>
            e.name.toLowerCase().includes((value || '').toLowerCase())
          );
          if (found.length === 0) {
            return `Không tìm thấy nhân viên "${value}".`;
          }
          if (found.length === 1) {
            const emp = found[0];
            return `Nhân viên: ${emp.name}\nVị trí: ${emp.position || 'Chưa xác định'}\nID: ${emp.id}`;
          }
          const list = found
            .slice(0, 5)
            .map((e: any) => `• ${e.name}`)
            .join('\n');
          return `Tìm thấy ${found.length} nhân viên:\n${list}`;
        }

        case 'get-department': {
          const departments = await this.departmentsService.list();
          const found = departments.filter((d: any) =>
            d.name.toLowerCase().includes((value || '').toLowerCase())
          );
          if (found.length === 0) {
            return `Không tìm thấy phòng ban "${value}".`;
          }
          if (found.length === 1) {
            const dept = found[0];
            return `Phòng ban: ${dept.name}\nID: ${dept.id}`;
          }
          const list = found
            .slice(0, 5)
            .map((d: any) => `• ${d.name}`)
            .join('\n');
          return `Tìm thấy ${found.length} phòng ban:\n${list}`;
        }

        default:
          return 'Không thể xử lý query này.';
      }
    } catch (error) {
      this.logger.error(`Error handling simple query: ${error}`);
      throw error;
    }
  }

  /**
   * Xử lý medium queries (dùng ChromaDB + Neo4j)
   */
  private async handleMediumQuery(
    type: string,
    value: string | undefined,
    message: string,
  ): Promise<string> {
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
          // Use ChromaDB for semantic search
          try {
            const results = await this.chromaDBService.search(
              'employees',
              message,
              5,
            );
            if (results.length > 0) {
              const list = results
                .map((r) => `• ${r.metadata.name} (Relevance: ${(r.similarity * 100).toFixed(1)}%)`)
                .join('\n');
              return `Nhân viên phù hợp:\n${list}`;
            }
          } catch (err) {
            this.logger.warn('ChromaDB search failed, falling back to text search');
          }

          // Fallback to text search
          const results = await this.searchService.search({ query: value || message });
          if (results.length === 0) {
            return `Không tìm thấy kết quả phù hợp.`;
          }
          const list = results
            .slice(0, 5)
            .map((r: any) => `• ${r.name}`)
            .join('\n');
          return `Kết quả tìm kiếm:\n${list}`;
        }

        case 'compare': {
          // Dùng Gemini để so sánh
          return await this.geminiService.generateResponse(
            message,
            'Bạn là một trợ lý thông minh cho hệ thống quản lý nhân sự. Hãy trả lời bằng tiếng Việt.',
          );
        }

        case 'relationship': {
          // Tìm kiếm mối liên quan
          const results = await this.searchService.search({ query: value || message });
          if (results.length === 0) {
            return 'Không tìm thấy mối liên quan nào.';
          }
          const list = results
            .slice(0, 5)
            .map((r: any) => `• ${r.name} (${r.type})`)
            .join('\n');
          return `Mối liên quan tìm được:\n${list}`;
        }

        default:
          return 'Không thể xử lý query này.';
      }
    } catch (error) {
      this.logger.error(`Error handling medium query: ${error}`);
      throw error;
    }
  }

  /**
   * Xử lý complex queries (dùng Gemini)
   */
  private async handleComplexQuery(
    type: string,
    value: string | undefined,
    message: string,
  ): Promise<string> {
    try {
      // Tạo context từ data hiện có - wrap trong try-catch để không block Gemini nếu DB lỗi
      let context = `Bạn là một trợ lý thông minh cho hệ thống quản lý nhân sự và dự án (EKG).\n\n`;
      
      try {
        const employees = await this.employeesService.list();
        const departments = await this.departmentsService.list();
        const projects = await this.projectsService.list();

        context += `Dữ liệu hiện tại:\n- Số nhân viên: ${employees.length}\n- Số phòng ban: ${departments.length}\n- Số dự án: ${projects.length}\n\n`;
      } catch (dbError) {
        // Nếu database lỗi, vẫn tiếp tục với Gemini nhưng không có context
        this.logger.warn(`Could not fetch database context for complex query: ${dbError}`);
        context += `Lưu ý: Không thể truy cập dữ liệu database hiện tại.\n\n`;
      }

      context += `Hãy trả lời bằng tiếng Việt và cung cấp thông tin hữu ích dựa trên dữ liệu hệ thống.`;

      const response = await this.geminiService.generateResponse(message, context);
      return response;
    } catch (error) {
      this.logger.error(`Error handling complex query: ${error}`);
      throw error;
    }
  }

  /**
   * Index entities vào ChromaDB (để tối ưu semantic search sau này)
   */
  async indexEntitiesToChromaDB(): Promise<void> {
    try {
      this.logger.log('Starting to index entities to ChromaDB...');

      // Index employees
      const employees = await this.employeesService.list();
      if (employees.length > 0) {
        const empDocs = employees.map((emp: any) => ({
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

      // Index skills
      const skills = await this.skillsService.list();
      if (skills.length > 0) {
        const skillDocs = skills.map((skill: any) => ({
          id: skill.id,
          content: skill.name,
          metadata: {
            type: 'skill',
            name: skill.name,
          },
        }));
        await this.chromaDBService.addDocuments('skills', skillDocs);
      }

      // Index departments
      const departments = await this.departmentsService.list();
      if (departments.length > 0) {
        const deptDocs = departments.map((dept: any) => ({
          id: dept.id,
          content: dept.name,
          metadata: {
            type: 'department',
            name: dept.name,
          },
        }));
        await this.chromaDBService.addDocuments('departments', deptDocs);
      }

      // Index projects
      const projects = await this.projectsService.list();
      if (projects.length > 0) {
        const projDocs = projects.map((proj: any) => ({
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
    } catch (error) {
      this.logger.error(`Error indexing entities to ChromaDB: ${error}`);
      throw error;
    }
  }
}
