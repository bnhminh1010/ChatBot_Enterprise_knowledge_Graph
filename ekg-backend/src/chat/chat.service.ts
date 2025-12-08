import { Injectable, Logger } from '@nestjs/common';
// QueryClassifierService removed - using Gemini agents for all queries
import { OllamaService } from '../ai/ollama.service';
import { ChromaDBService } from '../ai/chroma-db.service';
import { GeminiService } from '../ai/gemini.service';
import { OpenRouterService } from '../ai/openrouter.service';

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
import { UploadIntentHandlerService } from './services/upload-intent-handler.service';
import { ContextCompressionService } from './services/context-compression.service';
import { UserPreferenceService } from './services/user-preference.service';
import { SuggestedQuestionsService } from './services/suggested-questions.service';
import { DatabaseContextService } from './services/database-context.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    // QueryClassifierService removed
    private ollamaService: OllamaService,
    private chromaDBService: ChromaDBService,
    private geminiService: GeminiService,
    private openRouterService: OpenRouterService, // 🆕 OpenRouter fallback
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
    private uploadIntentHandler: UploadIntentHandlerService,
    private contextCompressionService: ContextCompressionService, // Phase 3
    private userPreferenceService: UserPreferenceService, // Phase 3
    private suggestedQuestionsService: SuggestedQuestionsService, // Phase 4
    private databaseContextService: DatabaseContextService, // Schema-aware context
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
    queryLevel: 'simple' | 'agent'; // Support both levels
    processingTime: number;
    conversationId?: string;
    metadata?: {
      confidence?: number;
      reasoning?: string[];
      warnings?: string[];
      retrievedDataSources?: string[];
    };
    suggestedQuestions?: Array<{
      question: string;
      category: string;
    }>;
  }> {
    const startTime = Date.now();

    try {
      // ... (existing code for conversation setup) ...
      // Bước 0: Tạo hoặc lấy conversation (Redis instead of Neo4j)
      let activeConversationId = conversationId;

      // Always create/get conversation (use anonymous if no userId)
      try {
        const effectiveUserId = userId || 'anonymous';
        activeConversationId =
          await this.redisConversationService.getOrCreateConversation(
            effectiveUserId,
            conversationId,
          );
        this.logger.debug(`Using conversation: ${activeConversationId}`);
      } catch (error) {
        this.logger.warn(`Could not create/get conversation: ${error}`);
        // Keep activeConversationId from frontend if Redis fails
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

      // ========== UPLOAD INTENT DETECTION ==========
      if (this.uploadIntentHandler.hasUploadIntent(message)) {
        this.logger.log('🔍 Detected upload intent');
        const uploadResponse =
          await this.uploadIntentHandler.handleUploadIntent(message);

        if (uploadResponse) {
          const responseStr =
            uploadResponse.type === 'upload_prompt'
              ? JSON.stringify(uploadResponse)
              : uploadResponse.content;

          if (activeConversationId) {
            await this.redisConversationService.addMessage(
              activeConversationId,
              'assistant',
              responseStr,
            );
          }

          return {
            response: responseStr,
            queryType: 'upload_intent',
            queryLevel: 'simple',
            processingTime: Date.now() - startTime,
            conversationId: activeConversationId,
          };
        }
      }

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

      // ========== CONTEXTUAL FOLLOW-UP DETECTION ==========
      // Handle confirmation queries like "Có", "Yes", "OK" based on previous context
      if (activeConversationId && message.trim().length < 20) {
        const messageLower = message.toLowerCase().trim();
        const isConfirmation = [
          'có',
          'yes',
          'ok',
          'được',
          'đồng ý',
          'rồi',
        ].includes(messageLower);

        if (isConfirmation) {
          try {
            // Get last assistant message
            const history =
              await this.redisConversationService.getConversationContext(
                activeConversationId,
                3, // Get last 3  messages
              );

            // Find the last assistant message with a prompt
            const lastAssistantMsg = history
              .reverse()
              .find(
                (m) =>
                  m.role === 'assistant' && m.content.includes('Bạn có muốn'),
              );

            if (lastAssistantMsg) {
              this.logger.log(
                '🔄 Detected confirmation for prompt in previous message',
              );

              // Extract context from previous message
              let followUpQuery = '';

              // Check various prompt patterns
              if (lastAssistantMsg.content.includes('dự án')) {
                // Extract project name from context
                const projectMatch =
                  lastAssistantMsg.content.match(/dự án\s+([A-Z0-9]+)/i);
                if (projectMatch) {
                  followUpQuery = `Thông tin về dự án ${projectMatch[1]}`;
                }
              } else if (lastAssistantMsg.content.includes('phòng ban')) {
                const deptMatch =
                  lastAssistantMsg.content.match(/phòng\s+(\w+)/i);
                if (deptMatch) {
                  followUpQuery = `Thông tin phòng ${deptMatch[1]}`;
                }
              } else if (lastAssistantMsg.content.includes('nhân viên')) {
                const empMatch =
                  lastAssistantMsg.content.match(/nhân viên\s+(.+?)\s+/i);
                if (empMatch) {
                  followUpQuery = `Thông tin nhân viên ${empMatch[1]}`;
                }
              }

              // If we extracted a follow-up query, process it
              if (followUpQuery) {
                this.logger.log(
                  `📝 Rewriting query: "${message}" → "${followUpQuery}"`,
                );
                message = followUpQuery; // Replace the query!
              } else {
                // Generic follow-up based on last context
                this.logger.log('Using generic follow-up handler');
                message = lastAssistantMsg.content
                  .replace(/Bạn có muốn.+?\?/g, '')
                  .trim();
                if (message.includes('Không tìm thấy')) {
                  // Extract entity from "Không tìm thấy X"
                  const entityMatch = message.match(/Không tìm thấy (.+?)\./);
                  if (entityMatch) {
                    message = `Thông tin về ${entityMatch[1]}`;
                  }
                }
              }
            }
          } catch (err) {
            this.logger.warn(`Could not process confirmation: ${err}`);
          }
        }
      }

      // ========== NEW: ALWAYS USE GEMINI AGENTS ==========
      // No more manual classification - let Gemini choose appropriate tools
      this.logger.log(
        '📦 Sending 33 tools to Gemini: universal_search, search_employees_by_name, search_employees_by_level, search_employees_by_email, search_employees_by_phone, search_employees_by_status, get_employee_by_id, count_employees, search_employees_by_department, search_employees_advanced, search_positions_by_name, search_positions_by_level, search_positions_by_group, count_positions, search_departments_by_name, search_departments_by_code, get_department_by_id, count_departments, search_projects_by_name, search_projects_by_client, search_projects_by_status, search_projects_by_field, search_projects_by_type, get_project_by_id, count_projects, get_project_manager, search_technologies_by_name, search_technologies_by_type, count_technologies, list_skills, get_document_content, list_project_documents, search_documents',
      );

      // Use Gemini agents for ALL queries (complex query handler)
      response = await this.handleComplexQuery(
        'agent-search', // Generic type
        undefined,
        message,
        activeConversationId,
        userId, // Pass userId for preference tracking
      );

      const processingTime = Date.now() - startTime;

      // Lưu assistant response vào Redis
      if (activeConversationId) {
        try {
          await this.redisConversationService.addMessage(
            activeConversationId,
            'assistant',
            response,
            {
              queryType: 'agent-search',
              queryLevel: 'agent',
              processingTime,
            },
          );
        } catch (error) {
          this.logger.warn(`Could not save assistant response: ${error}`);
        }
      }

      // 🆕 Phase 4: Generate suggested follow-up questions
      let suggestedQuestions: Array<{ question: string; category: string }> =
        [];
      try {
        const suggestions =
          this.suggestedQuestionsService.generateQuickSuggestions(
            'agent-search',
            [], // No entities extracted here, could be enhanced
          );
        suggestedQuestions = suggestions.map((s) => ({
          question: s.question,
          category: s.category,
        }));
      } catch (error) {
        this.logger.warn(`Could not generate suggestions: ${error}`);
      }

      return {
        response,
        queryType: 'agent-search',
        queryLevel: 'agent',
        processingTime,
        conversationId: activeConversationId,
        suggestedQuestions,
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
          // findBySkill returns { employees, graphData }, not just employees array
          const result = await this.employeesService.findBySkill(filters.skill);
          employees = result.employees; // Extract employees array
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
   * ENHANCED: With context compression to optimize tokens
   */
  private async handleComplexQuery(
    type: string,
    value: string | undefined,
    message: string,
    conversationId?: string,
    userId?: string,
  ): Promise<string> {
    try {
      // 1. Get conversation history with compression
      let conversationHistory: Array<{
        role: 'user' | 'assistant' | 'function';
        content: string;
      }> = [];
      let contextSummary = '';

      this.logger.debug(
        `🔍 handleComplexQuery - conversationId: ${conversationId || 'NOT PROVIDED'}`,
      );

      if (conversationId) {
        try {
          // Get all messages for compression
          const messages =
            await this.redisConversationService.getConversationContext(
              conversationId,
              20, // Get more messages for compression analysis
            );

          this.logger.debug(
            `🔍 Got ${messages.length} messages from Redis for conversation ${conversationId}`,
          );

          // 🆕 Phase 3: Compress context
          const compressed =
            await this.contextCompressionService.compressContext(messages);

          // Use summary and recent messages
          contextSummary = compressed.summary;

          // 🆕 Include key entities in context for better follow-up handling
          if (compressed.keyEntities.length > 0) {
            const entityList = compressed.keyEntities
              .slice(0, 5)
              .map((e) => `${e.type}: "${e.value}"`)
              .join(', ');
            contextSummary += `\n🔑 Đã đề cập: ${entityList}`;
          }

          conversationHistory = compressed.recentMessages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            }));

          this.logger.debug(
            `Context compressed: ${messages.length} messages → ` +
              `${compressed.recentMessages.length} recent + summary (${compressed.tokenEstimate} tokens)`,
          );
        } catch (error) {
          this.logger.warn(`Could not retrieve conversation context: ${error}`);
        }
      }

      // 🆕 Phase 3: Record query for user preferences
      if (userId) {
        try {
          // Extract topic from query type
          const topic = type.split('-')[0]; // e.g., 'agent-search' -> 'agent'
          await this.userPreferenceService.recordQuery(
            userId,
            message,
            [],
            topic,
          );
        } catch (error) {
          this.logger.warn(`Could not record user preference: ${error}`);
        }
      }

      // 2. Prepare Tools
      const tools = this.geminiToolsService.getTools();
      this.logger.log(
        `📦 Sending ${tools.length} tools to Gemini: ${tools.map((t) => t.name).join(', ')}`,
      );

      // 3. Call Gemini with Tools
      // Enhanced context with explicit tool usage rules + conversation summary + database schema
      // Include conversation history summary with entities for better coherence

      // Build conversation context with ACTUAL recent messages for coreference
      let conversationContext = '';
      if (contextSummary) {
        conversationContext = `\n📋 TÓM TẮT: ${contextSummary}\n`;
      }
      // Add last 4 messages explicitly so Gemini can see what was just discussed
      if (conversationHistory.length > 0) {
        const recentChat = conversationHistory
          .slice(-6) // Get last 6 messages for more context
          .map(
            (m, idx) =>
              `[${idx + 1}] ${m.role === 'user' ? '👤 User' : '🤖 Bot'}: ${m.content.substring(0, 250)}`,
          )
          .join('\n');
        conversationContext += `\n📝 LỊCH SỬ HỘI THOẠI:\n${recentChat}\n`;

        // Extract mentioned entities from history for easier reference
        const entityPatterns = [
          /dự án[:\s]*[""]?([^""]+?)[""]?(?:\.|,|\s|$)/gi,
          /nhân viên:?\s*[""]?([^""]+?)[""]?(?:\.|,|\s|$)/gi,
          /phòng ban:?\s*[""]?([^""]+?)[""]?(?:\.|,|\s|$)/gi,
          /tên[:\s]*[""]?([^""]+?)[""]?(?:\.|,|\s|$)/gi,
        ];
        const mentionedEntities: string[] = [];
        for (const msg of conversationHistory.slice(-4)) {
          for (const pattern of entityPatterns) {
            const matches = msg.content.matchAll(pattern);
            for (const match of matches) {
              if (match[1] && match[1].length > 2 && match[1].length < 50) {
                mentionedEntities.push(match[1].trim());
              }
            }
          }
        }
        if (mentionedEntities.length > 0) {
          const uniqueEntities = [...new Set(mentionedEntities)].slice(0, 5);
          conversationContext += `\n🔖 ENTITIES ĐÃ NHẮC: ${uniqueEntities.join(', ')}\n`;
        }

        this.logger.debug(
          `🔍 Conversation history (${conversationHistory.length} msgs): ${recentChat.substring(0, 300)}`,
        );
      } else {
        this.logger.debug('🔍 No conversation history available');
      }

      // 🆕 Get database context (schema, statistics, sample data)
      let databaseContext = '';
      try {
        databaseContext = await this.databaseContextService.getAgentContext();
        if (databaseContext) {
          databaseContext = `\n${databaseContext}\n`;
        }
      } catch (error) {
        this.logger.warn(`Could not get database context: ${error}`);
      }

      const context = `Bạn là trợ lý AI thông minh cho hệ thống EKG (Enterprise Knowledge Graph).
${conversationContext}

🎯 NHIỆM VỤ: Trả lời câu hỏi về nhân sự, dự án, phòng ban, kỹ năng trong tổ chức.

📖 TỪ VỰNG QUAN TRỌNG:
- "Team" = "Phòng ban" (ví dụ: Team Frontend = Phòng ban Frontend)
- "nhân sự cần học bổ sung" = sử dụng tool find_employees_needing_training

📚 VÍ DỤ CÁCH XỬ LÝ CÂU HỎI:

Q: "Ai biết React trong phòng IT?"
→ Gọi: search_employees_advanced(skill="React", department="IT")

Q: "Team Frontend ai đang rảnh?" 
→ Gọi: get_team_availability(departmentName="Frontend")

Q: "Dự án nào đang triển khai?"  
→ Gọi: search_projects_by_status(status="Đang triển khai")

Q: "Cho tôi thông tin về phòng Kỹ thuật"
→ Gọi: search_departments_by_name(name="Kỹ thuật")

Q: "Nhân viên cấp Senior có bao nhiêu người?"
→ Gọi: search_employees_by_level(level="Senior")

Q: "Tìm tài liệu hướng dẫn sử dụng"
→ Gọi: search_documents(documentName="hướng dẫn sử dụng")

Q: "Tìm nhân sự cần học bổ sung" / "Ai cần đào tạo thêm?"
→ Gọi: find_employees_needing_training()

Q: "Dự án X có những ai tham gia?"
→ Gọi: get_project_by_id(id="X") hoặc search_projects_by_name(name="X")

Q: "Anh Minh làm ở đâu?" (context: đang nói về Nguyễn Văn Minh)
→ Gọi: search_employees_by_name(name="Nguyễn Văn Minh")

🔄 CONTEXT AWARENESS:
- "đó/nó/họ/anh ấy" → Tìm trong LỊCH SỬ ở trên
- KHÔNG hỏi lại thông tin đã có
- Thay thế tham chiếu bằng tên cụ thể khi gọi tool

📌 QUY TẮC:
- Luôn gọi tool để lấy dữ liệu, KHÔNG tự bịa
- Trả lời bằng tiếng Việt tự nhiên
- Nếu không tìm thấy → Nói rõ "Không tìm thấy"
- Format câu trả lời dễ đọc (bullet points nếu nhiều kết quả)`;

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
    } catch (error: any) {
      this.logger.error(`Error handling complex query: ${error}`);

      // 🆕 FALLBACK CHAIN: Gemini → OpenRouter → Ollama
      if (
        error.message?.includes('429') ||
        error.message?.includes('quota') ||
        error.message?.includes('Too Many Requests') ||
        error.message?.includes('exceeded')
      ) {
        this.logger.warn(
          '⚠️ Gemini quota exceeded, trying OpenRouter fallback...',
        );

        // 🔄 FALLBACK 1: Try OpenRouter
        try {
          if (this.openRouterService.isAvailable()) {
            this.logger.log(
              '🔄 Using OpenRouter as fallback (Gemini quota exceeded)',
            );

            // Build conversation history for OpenRouter
            let openRouterHistory: Array<{
              role: 'user' | 'assistant' | 'function';
              content: string;
            }> = [];
            if (conversationId) {
              try {
                const messages =
                  await this.redisConversationService.getConversationContext(
                    conversationId,
                    5,
                  );
                openRouterHistory = messages
                  .filter((m) => m.role === 'user' || m.role === 'assistant')
                  .map((m) => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.content,
                  }));
              } catch (e) {
                // Continue without history
              }
            }

            // Use OpenRouter with simple text generation (no tools in fallback)
            const openRouterContext =
              'Bạn là trợ lý AI thông minh cho hệ thống EKG. Trả lời câu hỏi về nhân sự, dự án, phòng ban trong tổ chức. Trả lời bằng tiếng Việt tự nhiên.';

            const openRouterResponse =
              await this.openRouterService.generateResponse(
                message,
                openRouterContext,
              );

            if (openRouterResponse && openRouterResponse.trim()) {
              return `🔄 *[OpenRouter Fallback]*\n\n${openRouterResponse}`;
            }
          }
        } catch (openRouterError: any) {
          this.logger.warn(
            `OpenRouter fallback failed: ${openRouterError.message}`,
          );

          // If OpenRouter also has quota issues, continue to Ollama
          if (
            !openRouterError.message?.includes('429') &&
            !openRouterError.message?.includes('quota')
          ) {
            // Log non-quota errors but still try Ollama
            this.logger.error(
              `OpenRouter error (non-quota): ${openRouterError.message}`,
            );
          }
        }

        // 🔄 FALLBACK 2: Try Ollama RAG
        this.logger.warn('⚠️ OpenRouter also failed, trying Ollama RAG...');
        try {
          const ollamaAvailable = await this.ollamaRAGService.isAvailable();
          if (ollamaAvailable) {
            this.logger.log('🔄 Using Ollama RAG as final fallback');

            // Build conversation history for Ollama
            let ollamaHistory: Array<{
              role: 'user' | 'assistant';
              content: string;
            }> = [];
            if (conversationId) {
              try {
                const messages =
                  await this.redisConversationService.getConversationContext(
                    conversationId,
                    5,
                  );
                ollamaHistory = messages
                  .filter((m) => m.role === 'user' || m.role === 'assistant')
                  .map((m) => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.content,
                  }));
              } catch (e) {
                // Continue without history
              }
            }

            // Use Ollama RAG service
            const ollamaResponse = await this.ollamaRAGService.queryWithRAG(
              message,
              'employees', // Default collection
              10,
              ollamaHistory,
            );

            return `🔄 *[Ollama Fallback - All APIs quota hết]*\n\n${ollamaResponse}`;
          } else {
            this.logger.warn('Ollama is not available for fallback');
          }
        } catch (ollamaError) {
          this.logger.error(`Ollama fallback also failed: ${ollamaError}`);
        }

        return 'Xin lỗi, hệ thống đang quá tải. Vui lòng thử lại sau.';
      }

      // Handle empty model output error gracefully
      if (
        error.message?.includes(
          'model output must contain either output text or tool calls',
        ) ||
        error.message?.includes('empty')
      ) {
        return 'Xin lỗi, tôi không thể xử lý yêu cầu này. Vui lòng thử lại với câu hỏi đơn giản hơn.';
      }

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
