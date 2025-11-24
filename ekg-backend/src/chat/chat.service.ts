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
import { ConversationHistoryService } from './services/conversation-history.service';
import { RedisConversationService } from './services/redis-conversation.service';
import { OllamaRAGService } from './services/ollama-rag.service';
import { GeminiToolsService } from '../ai/gemini-tools.service';
import { PositionsService } from '../positions/positions.service';
import { TechnologiesService } from '../technologies/technologies.service';

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
    private conversationHistoryService: ConversationHistoryService,
    private redisConversationService: RedisConversationService,
    private ollamaRAGService: OllamaRAGService,
    private geminiToolsService: GeminiToolsService,
    private positionsService: PositionsService,
    private technologiesService: TechnologiesService,
  ) {}

  /**
   * Xử lý user query và trả về response
   */
  async processQuery(
    message: string,
    conversationId?: string,
    userId?: string,
  ): Promise<{
    response: string;
    queryType: string;
    queryLevel: 'simple' | 'medium' | 'complex';
    processingTime: number;
    conversationId?: string;
  }> {
    const startTime = Date.now();

    try {
      // ... (existing code for conversation setup) ...
      // Bước 0: Tạo hoặc lấy conversation (Redis instead of Neo4j)
      let activeConversationId = conversationId;

      if (userId) {
        try {
          activeConversationId =
            await this.redisConversationService.getOrCreateConversation(
              userId,
              conversationId,
            );
          this.logger.debug(`Using conversation: ${activeConversationId}`);
        } catch (error) {
          this.logger.warn(`Could not create/get conversation: ${error}`);
        }
      }

      // Lưu user message vào Redis
      if (activeConversationId) {
        try {
          await this.redisConversationService.addMessage(
            activeConversationId,
            'user',
            message,
          );
        } catch (error) {
          this.logger.warn(`Could not save user message: ${error}`);
        }
      }

      let response = '';

      // QUICK FIX: Early pattern matching for employee name queries
      // ... (existing code) ...
      const employeeNamePattern =
        /(?:id.*?nhân viên.*?tên|nhân viên.*?tên|tìm.*?nhân viên.*?tên)\s+(.+?)(?:\s*$|\.|\?)/i;
      const nameMatch = message.match(employeeNamePattern);

      if (nameMatch && nameMatch[1]) {
        // ... (existing implementation) ...
        const employeeName = nameMatch[1].trim();
        // ... (keep existing logic for now) ...
        try {
          const found = await this.employeesService.findByName(
            employeeName,
            0,
            10,
          );
          if (found.length === 1) {
            const emp = found[0];
            response = `✅ Tìm thấy nhân viên:\\n\\n👤 **${emp.name}**\\n🆔 Mã: ${emp.empId || emp.id}\\n💼 Vị trí: ${emp.position || 'Chưa xác định'}\\n🏢 Phòng ban: ${emp.department || 'N/A'}`;
          } else if (found.length > 1) {
            const list = found
              .slice(0, 5)
              .map(
                (e: any) =>
                  `• ${e.name} (${e.empId || e.id}) - ${e.position || 'N/A'}`,
              )
              .join('\\n');
            response = `Tìm thấy ${found.length} nhân viên có tên tương tự:\\n${list}`;
          } else {
            response = `Không tìm thấy nhân viên có tên "${employeeName}". Hãy kiểm tra lại tên hoặc thử tìm theo phòng ban.`;
          }

          if (activeConversationId) {
            await this.redisConversationService.addMessage(
              activeConversationId,
              'assistant',
              response,
            );
          }
          return {
            response,
            queryType: 'employee-name-search',
            queryLevel: 'simple',
            processingTime: Date.now() - startTime,
            conversationId: activeConversationId,
          };
        } catch (e) {
          /* fallback */
        }
      }

      // Bước 1: Phân loại query
      const classified = this.queryClassifier.classifyQuery(message);
      this.logger.debug(
        `Query classified: ${classified.type} (${classified.level})`,
      );

      // FORCE COMPLEX for testing tools if query contains "chức danh", "vị trí", or "kỹ năng"
      // This is a temporary override to ensure tools are used for the user's request
      if (
        message.toLowerCase().includes('chức danh') ||
        message.toLowerCase().includes('vị trí') ||
        message.toLowerCase().includes('kỹ năng') ||
        message.toLowerCase().includes('skill') ||
        message.toLowerCase().includes('danh sách kỹ năng') ||
        classified.type === 'filter-search' // NEW: Upgrade filter-search to complex
      ) {
        classified.level = 'complex';
        classified.type = 'tool-enabled-search';
        this.logger.log(`🔧 Forced complex level for skill/position/filter query`);
      }

      // Bước 2: Xử lý theo level
      switch (classified.level) {
        case 'simple':
          response = await this.handleSimpleQuery(
            classified.type,
            classified.value,
          );
          break;

        case 'medium':
          // ... (existing medium logic) ...
          if (
            classified.filters &&
            Object.keys(classified.filters).length > 0
          ) {
            response = await this.handleFilteredQuery(
              classified.type,
              classified.filters,
              message,
            );
          } else {
            response = await this.handleMediumQuery(
              classified.type,
              classified.value,
              message,
              activeConversationId,
            );
          }
          break;

        case 'complex':
          // Use new Tool-enabled flow
          response = await this.handleComplexQuery(
            classified.type,
            classified.value,
            message,
            activeConversationId,
          );
          break;

        default:
          response =
            'Xin lỗi, tôi không hiểu yêu cầu của bạn. Hãy thử các lệnh như "Danh sách nhân viên", "Tìm [tên]", etc.';
      }

      const processingTime = Date.now() - startTime;

      // Lưu assistant response vào Redis
      if (activeConversationId) {
        try {
          await this.redisConversationService.addMessage(
            activeConversationId,
            'assistant',
            response,
            {
              queryType: classified.type,
              queryLevel: classified.level,
              processingTime,
            },
          );
        } catch (error) {
          this.logger.warn(`Could not save assistant response: ${error}`);
        }
      }

      return {
        response,
        queryType: classified.type,
        queryLevel: classified.level,
        processingTime,
        conversationId: activeConversationId,
      };
    } catch (error) {
      // ... (existing error handling) ...
      this.logger.error(`Error processing query: ${error}`);
      return {
        response: `Có lỗi xảy ra: ${error instanceof Error ? error.message : 'Unknown error'}`,
        queryType: 'error',
        queryLevel: 'simple',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Xử lý simple queries (dùng Neo4j)
   */
  private async handleSimpleQuery(
    type: string,
    value?: string,
  ): Promise<string> {
    try {
      switch (type) {
        case 'list-employees': {
          const employees = await this.employeesService.list();
          if (employees.length === 0) {
            return 'Không có nhân viên nào trong hệ thống.';
          }
          const list = employees
            .slice(0, 10)
            .map(
              (emp: any) =>
                `• ${emp.name} - ${emp.position || 'Chưa xác định'}`,
            )
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
            .map(
              (proj: any) =>
                `• ${proj.name} - ${proj.status || 'Chưa xác định'}`,
            )
            .join('\n');
          return `Danh sách dự án (${projects.length}):\n${list}${projects.length > 10 ? '\n... và ' + (projects.length - 10) + ' dự án khác' : ''}`;
        }

        case 'search-global': {
          const results = await this.searchService.search({
            query: value || '',
          });
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
            e.name.toLowerCase().includes((value || '').toLowerCase()),
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
            d.name.toLowerCase().includes((value || '').toLowerCase()),
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
   * NEW: Handle filtered queries
   * Examples: "Nhân viên phòng Frontend", "Nhân viên có kỹ năng Python"
   */
  private async handleFilteredQuery(
    type: string,
    filters: {
      department?: string;
      skill?: string;
      project?: string;
      position?: string;
    },
    originalMessage: string,
  ): Promise<string> {
    this.logger.debug(
      `Handling filtered query: ${type}, filters: ${JSON.stringify(filters)}`,
    );

    try {
      // Handle list-employees-filtered
      if (type === 'list-employees-filtered') {
        let employees: any[] = [];
        let filterContext = '';

        // Filter by department
        if (filters.department) {
          try {
            const dept = await this.departmentsService.findByName(
              filters.department,
            );
            employees = await this.employeesService.findByDepartment(dept.code);
            filterContext = `Phòng ban: ${dept.name}`;
          } catch (error) {
            return `Không tìm thấy phòng ban "${filters.department}". Hãy thử lại với tên chính xác.`;
          }
        }
        // Filter by skill
        else if (filters.skill) {
          employees = await this.employeesService.findBySkill(filters.skill);
          filterContext = `Kỹ năng: ${filters.skill}`;
        }
        // Filter by project
        else if (filters.project) {
          employees = await this.employeesService.findByProject(
            filters.project,
          );
          filterContext = `Dự án: ${filters.project}`;
        }
        // Filter by position
        else if (filters.position) {
          employees = await this.employeesService.findByPosition(
            filters.position,
          );
          filterContext = `Chức danh: ${filters.position}`;
        }

        // Format response
        if (!employees || employees.length === 0) {
          return `Không tìm thấy nhân viên nào với điều kiện: ${filterContext}`;
        }

        const list = employees
          .slice(0, 10)
          .map((e, idx) => {
            const skills =
              e.skills
                ?.filter((s: any) => s.name)
                .map((s: any) => s.name)
                .join(', ') || 'N/A';
            return `${idx + 1}. ${e.name} (${e.position || 'N/A'}) - Skills: ${skills}`;
          })
          .join('\n');

        const moreInfo =
          employees.length > 10
            ? `\n... và ${employees.length - 10} nhân viên khác`
            : '';

        return `📋 Danh sách nhân viên - ${filterContext} (${employees.length}):\n${list}${moreInfo}`;
      }

      // Fallback for unknown filtered types
      return `Xin lỗi, tôi chưa hỗ trợ filter cho query type: ${type}`;
    } catch (error) {
      this.logger.error(`Error in handleFilteredQuery: ${error}`);
      return `Có lỗi xảy ra khi xử lý filtered query: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Xử lý medium queries (dùng ChromaDB + Neo4j)
   */
  private async handleMediumQuery(
    type: string,
    value: string | undefined,
    message: string,
    conversationId?: string,
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

        case 'semantic-search':
        case 'filter-search': {
          // Get conversation history for context
          let conversationHistory: Array<{
            role: 'user' | 'assistant';
            content: string;
          }> = [];
          if (conversationId) {
            try {
              const messages =
                await this.redisConversationService.getConversationContext(
                  conversationId,
                  5, // Last 5 messages for medium queries
                );
              conversationHistory = messages
                .filter((m) => m.role === 'user' || m.role === 'assistant')
                .map((m) => ({
                  role: m.role as 'user' | 'assistant',
                  content: m.content,
                }));
            } catch (error) {
              // Continue without history
            }
          }

          // Try Ollama RAG first WITH history
          try {
            const ragResponse = await this.ollamaRAGService.queryWithRAG(
              message,
              'employees',
              10,
              conversationHistory,
            );
            return ragResponse;
          } catch (ragError) {
            this.logger.warn(
              'Ollama RAG failed, falling back to ChromaDB direct search',
            );
          }

          // Fallback: ChromaDB direct search
          try {
            const results = await this.chromaDBService.search(
              'employees',
              message,
              5,
            );
            if (results.length > 0) {
              const list = results
                .map(
                  (r) =>
                    `• ${r.metadata.name} (Relevance: ${(r.similarity * 100).toFixed(1)}%)`,
                )
                .join('\n');
              return `Nhân viên phù hợp:\n${list}`;
            }
          } catch (err) {
            this.logger.warn(
              'ChromaDB search failed, falling back to text search',
            );
          }

          // Last fallback: text search
          const results = await this.searchService.search({
            query: value || message,
          });
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
          const results = await this.searchService.search({
            query: value || message,
          });
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
   * Xử lý complex queries (dùng Gemini + Tools)
   */
  private async handleComplexQuery(
    type: string,
    value: string | undefined,
    message: string,
    conversationId?: string,
  ): Promise<string> {
    try {
      // 1. Get conversation history
      let conversationHistory: Array<{
        role: 'user' | 'assistant' | 'function';
        content: string;
      }> = [];

      if (conversationId) {
        try {
          const messages =
            await this.redisConversationService.getConversationContext(
              conversationId,
              10,
            );
          conversationHistory = messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            }));
        } catch (error) {
          this.logger.warn(`Could not retrieve conversation context: ${error}`);
        }
      }

      // 2. Prepare Tools
      const tools = this.geminiToolsService.getTools();
      this.logger.log(
        `📦 Sending ${tools.length} tools to Gemini: ${tools.map((t) => t.name).join(', ')}`,
      );

      // 3. Call Gemini with Tools
      // Enhanced context with explicit tool usage rules
      const context = `Bạn là trợ lý AI cho hệ thống EKG. 

⚠️ IMPORTANT TOOL USAGE RULES:
1. When user asks "danh sách kỹ năng" or "tất cả kỹ năng" or "có những kỹ năng gì":
   → MUST use "list_skills" tool (NO parameters needed)
   → NEVER use "search_employees_by_name" for this
   
2. "list_skills" returns ONLY skill names, NOT employee information

3. When user asks about employees with specific skills:
   → Then use "search_employees_by..." tools

Hãy sử dụng các công cụ được cung cấp để trả lời câu hỏi của người dùng một cách chính xác.`;

      let geminiResult = await this.geminiService.generateResponseWithTools(
        message,
        tools,
        context,
        conversationHistory,
      );

      // 4. Handle Tool Execution Loop (max 5 turns to prevent infinite loops)
      let loopCount = 0;
      const maxLoops = 5;

      while (geminiResult.type === 'function_call' && loopCount < maxLoops) {
        loopCount++;
        const toolResults: any[] = [];

        // Execute all requested functions
        for (const call of geminiResult.functionCalls) {
          const toolName = call.name;
          const toolArgs = call.args;

          this.logger.log(
            `Executing tool: ${toolName} with args: ${JSON.stringify(toolArgs)}`,
          );

          const result = await this.geminiToolsService.executeTool(
            toolName,
            toolArgs,
          );

          toolResults.push({
            name: toolName,
            result: result,
          });
        }

        // Send results back to Gemini
        geminiResult = await this.geminiService.continueChatWithToolResults(
          geminiResult.chatSession,
          toolResults,
        );
      }

      // 5. Return final text response
      if (geminiResult.type === 'text') {
        return geminiResult.content;
      } else {
        return 'Xin lỗi, tôi không thể hoàn thành yêu cầu do quá trình xử lý quá phức tạp.';
      }
    } catch (error) {
      this.logger.error(`Error handling complex query: ${error}`);
      throw error;
    }
  }

  /**
   * Index entities vào ChromaDB với Vietnamese-rich content
   * Enhanced version với full schema fields và semantic keywords
   */
  async indexEntitiesToChromaDB(): Promise<void> {
    try {
      this.logger.log('🚀 Starting enhanced indexing to ChromaDB...');

      // ===== 1. INDEX EMPLOYEES (NhanSu) =====
      this.logger.log('📝 Indexing employees...');
      const employees = await this.employeesService.list();
      if (employees.length > 0) {
        const empDocs = employees.map((emp: any) => {
          const skillNames =
            emp.skills?.map((s: any) => s.name).join(', ') || 'Chưa có kỹ năng';

          return {
            id: emp.id || emp.empId,
            content: `
Nhân viên ${emp.name}
Họ tên: ${emp.name}
Cấp bậc hiện tại: ${emp.level || 'Chưa xác định'}
Chức danh: ${emp.position || 'Chưa xác định'}
Email công ty: ${emp.email || 'Chưa có email'}
Số điện thoại: ${emp.phone || 'Chưa có số điện thoại'}
Trạng thái làm việc: ${emp.status || 'Active'}
Kỹ năng: ${skillNames}
            `.trim(),
            metadata: {
              type: 'employee',
              id: emp.id || emp.empId,
              name: emp.name,
              level: emp.level || '',
              position: emp.position || '',
              email: emp.email || '',
              phone: emp.phone || '',
              status: emp.status || 'Active',
              skillNames: emp.skills?.map((s: any) => s.name) || [],
              skillCount: emp.skills?.length || 0,
            },
          };
        });
        await this.chromaDBService.addDocuments('employees', empDocs);
        this.logger.log(`✅ Indexed ${empDocs.length} employees`);
      }

      // ===== 2. INDEX DEPARTMENTS (PhongBan) =====
      this.logger.log('📝 Indexing departments...');
      const departments = await this.departmentsService.list();
      if (departments.length > 0) {
        const deptDocs = departments.map((dept: any) => ({
          id: dept.id || dept.code,
          content: `
Phòng ban ${dept.name}
Tên phòng ban: ${dept.name}
Mã phòng ban: ${dept.code || 'Chưa có mã'}
Mô tả: ${dept.description || 'Chưa có mô tả'}
          `.trim(),
          metadata: {
            type: 'department',
            id: dept.id || dept.code,
            code: dept.code || '',
            name: dept.name,
            description: dept.description || '',
          },
        }));
        await this.chromaDBService.addDocuments('departments', deptDocs);
        this.logger.log(`✅ Indexed ${deptDocs.length} departments`);
      }

      // ===== 3. INDEX PROJECTS (DuAn) =====
      this.logger.log('📝 Indexing projects...');
      const projects = await this.projectsService.list();
      if (projects.length > 0) {
        const projDocs = projects.map((proj: any) => {
          const techList = proj.technologies?.join(', ') || 'Chưa có công nghệ';

          return {
            id: proj.id || proj.key,
            content: `
Dự án ${proj.name}
Tên dự án: ${proj.name}
Mã dự án: ${proj.key || 'Chưa có mã'}
Trạng thái: ${proj.status || 'Active'}
Công nghệ sử dụng: ${techList}
            `.trim(),
            metadata: {
              type: 'project',
              id: proj.id || proj.key,
              key: proj.key || '',
              name: proj.name,
              status: proj.status || '',
              technologies: proj.technologies || [],
              technologyCount: proj.technologies?.length || 0,
            },
          };
        });
        await this.chromaDBService.addDocuments('projects', projDocs);
        this.logger.log(`✅ Indexed ${projDocs.length} projects`);
      }

      // ===== 4. INDEX SKILLS (KyNang) =====
      this.logger.log('📝 Indexing skills...');
      const skills = await this.skillsService.list();
      if (skills.length > 0) {
        const skillDocs = skills.map((skill: any) => ({
          id: skill.id || skill.name,
          content: `
Kỹ năng ${skill.name}
Tên kỹ năng: ${skill.name}
          `.trim(),
          metadata: {
            type: 'skill',
            id: skill.id || skill.name,
            name: skill.name,
          },
        }));
        await this.chromaDBService.addDocuments('skills', skillDocs);
        this.logger.log(`✅ Indexed ${skillDocs.length} skills`);
      }

      // ===== 5. INDEX POSITIONS (ChucDanh) =====
      this.logger.log('📝 Indexing positions...');
      const positions = await this.positionsService.list();
      if (positions.length > 0) {
        const posDocs = positions.map((pos: any) => ({
          id: pos.id || pos.code,
          content: `
Chức danh ${pos.name}
Tên chức danh: ${pos.name}
Cấp bậc: ${pos.level || 'Chưa xác định'}
Nhóm nghề: ${pos.group || 'Chưa xác định'}
Mô tả: ${pos.description || 'Chưa có mô tả'}
          `.trim(),
          metadata: {
            type: 'position',
            id: pos.id || pos.code,
            code: pos.code || '',
            name: pos.name,
            level: pos.level || '',
            group: pos.group || '',
            description: pos.description || '',
          },
        }));
        await this.chromaDBService.addDocuments('positions', posDocs);
        this.logger.log(`✅ Indexed ${posDocs.length} positions`);
      }

      // ===== 6. INDEX TECHNOLOGIES (CongNghe) =====
      this.logger.log('📝 Indexing technologies...');
      const technologies = await this.technologiesService.list();
      if (technologies.length > 0) {
        const techDocs = technologies.map((tech: any) => ({
          id: tech.id || tech.code,
          content: `
Công nghệ ${tech.name}
Tên công nghệ: ${tech.name}
Loại công nghệ: ${tech.type || 'Chưa xác định'}
Mô tả: ${tech.description || 'Chưa có mô tả'}
          `.trim(),
          metadata: {
            type: 'technology',
            id: tech.id || tech.code,
            code: tech.code || '',
            name: tech.name,
            techType: tech.type || '',
            description: tech.description || '',
          },
        }));
        await this.chromaDBService.addDocuments('technologies', techDocs);
        this.logger.log(`✅ Indexed ${techDocs.length} technologies`);
      }

      this.logger.log('🎉 Enhanced indexing completed successfully!');
    } catch (error) {
      this.logger.error(`❌ Error indexing entities to ChromaDB: ${error}`);
      throw error;
    }
  }
}
