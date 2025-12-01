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
const conversation_history_service_1 = require("./services/conversation-history.service");
const redis_conversation_service_1 = require("./services/redis-conversation.service");
const ollama_rag_service_1 = require("./services/ollama-rag.service");
const gemini_tools_service_1 = require("../ai/gemini-tools.service");
const positions_service_1 = require("../positions/positions.service");
const technologies_service_1 = require("../technologies/technologies.service");
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
    conversationHistoryService;
    redisConversationService;
    ollamaRAGService;
    geminiToolsService;
    positionsService;
    technologiesService;
    logger = new common_1.Logger(ChatService_1.name);
    constructor(queryClassifier, ollamaService, chromaDBService, geminiService, employeesService, skillsService, departmentsService, projectsService, searchService, conversationHistoryService, redisConversationService, ollamaRAGService, geminiToolsService, positionsService, technologiesService) {
        this.queryClassifier = queryClassifier;
        this.ollamaService = ollamaService;
        this.chromaDBService = chromaDBService;
        this.geminiService = geminiService;
        this.employeesService = employeesService;
        this.skillsService = skillsService;
        this.departmentsService = departmentsService;
        this.projectsService = projectsService;
        this.searchService = searchService;
        this.conversationHistoryService = conversationHistoryService;
        this.redisConversationService = redisConversationService;
        this.ollamaRAGService = ollamaRAGService;
        this.geminiToolsService = geminiToolsService;
        this.positionsService = positionsService;
        this.technologiesService = technologiesService;
    }
    async processQuery(message, conversationId, userId) {
        const startTime = Date.now();
        try {
            let activeConversationId = conversationId;
            if (userId) {
                try {
                    activeConversationId =
                        await this.redisConversationService.getOrCreateConversation(userId, conversationId);
                    this.logger.debug(`Using conversation: ${activeConversationId}`);
                }
                catch (error) {
                    this.logger.warn(`Could not create/get conversation: ${error}`);
                }
            }
            if (activeConversationId) {
                try {
                    await this.redisConversationService.addMessage(activeConversationId, 'user', message);
                }
                catch (error) {
                    this.logger.warn(`Could not save user message: ${error}`);
                }
            }
            let response = '';
            const employeeNamePattern = /(?:id.*?nhân viên.*?tên|nhân viên.*?tên|tìm.*?nhân viên.*?tên)\s+(.+?)(?:\s*$|\.|\?)/i;
            const nameMatch = message.match(employeeNamePattern);
            if (nameMatch && nameMatch[1]) {
                const employeeName = nameMatch[1].trim();
                try {
                    const found = await this.employeesService.findByName(employeeName, 0, 10);
                    if (found.length === 1) {
                        const emp = found[0];
                        response = `✅ Tìm thấy nhân viên:\\n\\n👤 **${emp.name}**\\n🆔 Mã: ${emp.empId || emp.id}\\n💼 Vị trí: ${emp.position || 'Chưa xác định'}\\n🏢 Phòng ban: ${emp.department || 'N/A'}`;
                    }
                    else if (found.length > 1) {
                        const list = found
                            .slice(0, 5)
                            .map((e) => `• ${e.name} (${e.empId || e.id}) - ${e.position || 'N/A'}`)
                            .join('\\n');
                        response = `Tìm thấy ${found.length} nhân viên có tên tương tự:\\n${list}`;
                    }
                    else {
                        response = `Không tìm thấy nhân viên có tên "${employeeName}". Hãy kiểm tra lại tên hoặc thử tìm theo phòng ban.`;
                    }
                    if (activeConversationId) {
                        await this.redisConversationService.addMessage(activeConversationId, 'assistant', response);
                    }
                    return {
                        response,
                        queryType: 'employee-name-search',
                        queryLevel: 'simple',
                        processingTime: Date.now() - startTime,
                        conversationId: activeConversationId,
                    };
                }
                catch (e) {
                }
            }
            const classified = this.queryClassifier.classifyQuery(message);
            this.logger.debug(`Query classified: ${classified.type} (${classified.level})`);
            if (message.toLowerCase().includes('chức danh') ||
                message.toLowerCase().includes('vị trí') ||
                message.toLowerCase().includes('kỹ năng') ||
                message.toLowerCase().includes('skill') ||
                message.toLowerCase().includes('danh sách kỹ năng') ||
                message.toLowerCase().includes('tài liệu') ||
                message.toLowerCase().includes('lấy tài liệu') ||
                message.toLowerCase().includes('file') ||
                classified.type === 'filter-search') {
                classified.level = 'complex';
                classified.type = 'tool-enabled-search';
                this.logger.log(`🔧 Forced complex level for skill/position/filter/document query`);
            }
            switch (classified.level) {
                case 'simple':
                    response = await this.handleSimpleQuery(classified.type, classified.value);
                    break;
                case 'medium':
                    if (classified.filters &&
                        Object.keys(classified.filters).length > 0) {
                        response = await this.handleFilteredQuery(classified.type, classified.filters, message);
                    }
                    else {
                        response = await this.handleMediumQuery(classified.type, classified.value, message, activeConversationId);
                    }
                    break;
                case 'complex':
                    response = await this.handleComplexQuery(classified.type, classified.value, message, activeConversationId);
                    break;
                default:
                    response =
                        'Xin lỗi, tôi không hiểu yêu cầu của bạn. Hãy thử các lệnh như "Danh sách nhân viên", "Tìm [tên]", etc.';
            }
            const processingTime = Date.now() - startTime;
            if (activeConversationId) {
                try {
                    await this.redisConversationService.addMessage(activeConversationId, 'assistant', response, {
                        queryType: classified.type,
                        queryLevel: classified.level,
                        processingTime,
                    });
                }
                catch (error) {
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
        }
        catch (error) {
            this.logger.error(`Error processing query: ${error}`);
            return {
                response: `Có lỗi xảy ra: ${error instanceof Error ? error.message : 'Unknown error'}`,
                queryType: 'error',
                queryLevel: 'simple',
                processingTime: Date.now() - startTime,
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
                    const results = await this.searchService.search({
                        query: value || '',
                    });
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
                    const skills = e.skills
                        ?.filter((s) => s.name)
                        .map((s) => s.name)
                        .join(', ') || 'N/A';
                    return `${idx + 1}. ${e.name} (${e.position || 'N/A'}) - Skills: ${skills}`;
                })
                    .join('\n');
                const moreInfo = employees.length > 10
                    ? `\n... và ${employees.length - 10} nhân viên khác`
                    : '';
                return `📋 Danh sách nhân viên - ${filterContext} (${employees.length}):\n${list}${moreInfo}`;
            }
            return `Xin lỗi, tôi chưa hỗ trợ filter cho query type: ${type}`;
        }
        catch (error) {
            this.logger.error(`Error in handleFilteredQuery: ${error}`);
            return `Có lỗi xảy ra khi xử lý filtered query: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }
    async handleMediumQuery(type, value, message, conversationId) {
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
                    let conversationHistory = [];
                    if (conversationId) {
                        try {
                            const messages = await this.redisConversationService.getConversationContext(conversationId, 5);
                            conversationHistory = messages
                                .filter((m) => m.role === 'user' || m.role === 'assistant')
                                .map((m) => ({
                                role: m.role,
                                content: m.content,
                            }));
                        }
                        catch (error) {
                        }
                    }
                    try {
                        const ragResponse = await this.ollamaRAGService.queryWithRAG(message, 'employees', 10, conversationHistory);
                        return ragResponse;
                    }
                    catch (ragError) {
                        this.logger.warn('Ollama RAG failed, falling back to ChromaDB direct search');
                    }
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
                    const results = await this.searchService.search({
                        query: value || message,
                    });
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
                    const results = await this.searchService.search({
                        query: value || message,
                    });
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
    async handleComplexQuery(type, value, message, conversationId) {
        try {
            let conversationHistory = [];
            if (conversationId) {
                try {
                    const messages = await this.redisConversationService.getConversationContext(conversationId, 10);
                    conversationHistory = messages
                        .filter((m) => m.role === 'user' || m.role === 'assistant')
                        .map((m) => ({
                        role: m.role,
                        content: m.content,
                    }));
                }
                catch (error) {
                    this.logger.warn(`Could not retrieve conversation context: ${error}`);
                }
            }
            const tools = this.geminiToolsService.getTools();
            this.logger.log(`📦 Sending ${tools.length} tools to Gemini: ${tools.map((t) => t.name).join(', ')}`);
            const context = `Bạn là trợ lý AI cho hệ thống EKG. 

⚠️ CRITICAL - DOCUMENT QUERIES (HIGHEST PRIORITY):

🚨 RULE #1 - NEVER ASK FOR DOCUMENT IDs:
- When user says "lấy tài liệu X", "tìm tài liệu Y", "file Z", "doc ABC"
- YOU MUST call "search_documents" tool with documentName extracted from user query
- NEVER reply with "Tôi cần ID dự án" or ask user for any IDs
- The search_documents tool will handle everything automatically

Example flows:
- User: "lấy tài liệu README" 
  → YOU: call search_documents(documentName="README")
  → System finds 1 result → auto calls get_document_content → show content
  
- User: "tài liệu thiết kế UI ZenDo"
  → YOU: call search_documents(documentName="thiết kế UI ZenDo")
  → System finds multiple → show numbered list
  
- User: "file mô hình đồ thị"
  → YOU: call search_documents(documentName="mô hình đồ thị")
  → System finds 0 → suggest alternatives

🔴 FORBIDDEN RESPONSES:
❌ "Bạn cần cung cấp ID dự án"
❌ "Vui lòng cho tôi biết ID tài liệu"
❌ "Tôi cần biết ID của dự án"

✅ CORRECT BEHAVIOR:
→ Immediately call search_documents tool
→ Let the system handle the rest

⚠️ OTHER TOOL USAGE RULES:

1. When user asks "danh sách kỹ năng" or "tất cả kỹ năng" or "có những kỹ năng gì":
   → MUST use "list_skills" tool (NO parameters needed)
   → NEVER use "search_employees_by_name" for this
   
2. "list_skills" returns ONLY skill names, NOT employee information

3. When user asks about employees with specific skills:
   → Then use "search_employees_by..." tools

Hãy sử dụng các công cụ được cung cấp để trả lời câu hỏi của người dùng một cách chính xác.`;
            let geminiResult = await this.geminiService.generateResponseWithTools(message, tools, context, conversationHistory);
            let loopCount = 0;
            const maxLoops = 5;
            while (geminiResult.type === 'function_call' && loopCount < maxLoops) {
                loopCount++;
                const toolResults = [];
                for (const call of geminiResult.functionCalls) {
                    const toolName = call.name;
                    const toolArgs = call.args;
                    this.logger.log(`Executing tool: ${toolName} with args: ${JSON.stringify(toolArgs)}`);
                    const result = await this.geminiToolsService.executeTool(toolName, toolArgs);
                    toolResults.push({
                        name: toolName,
                        result: result,
                    });
                }
                geminiResult = await this.geminiService.continueChatWithToolResults(geminiResult.chatSession, toolResults);
            }
            if (geminiResult.type === 'text') {
                return geminiResult.content;
            }
            else {
                return 'Xin lỗi, tôi không thể hoàn thành yêu cầu do quá trình xử lý quá phức tạp.';
            }
        }
        catch (error) {
            this.logger.error(`Error handling complex query: ${error}`);
            throw error;
        }
    }
    async indexEntitiesToChromaDB() {
        try {
            this.logger.log('🚀 Starting enhanced indexing to ChromaDB...');
            this.logger.log('📝 Indexing employees...');
            const employees = await this.employeesService.list();
            if (employees.length > 0) {
                const empDocs = employees.map((emp) => {
                    const skillNames = emp.skills?.map((s) => s.name).join(', ') || 'Chưa có kỹ năng';
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
                            skillNames: emp.skills?.map((s) => s.name) || [],
                            skillCount: emp.skills?.length || 0,
                        },
                    };
                });
                await this.chromaDBService.addDocuments('employees', empDocs);
                this.logger.log(`✅ Indexed ${empDocs.length} employees`);
            }
            this.logger.log('📝 Indexing departments...');
            const departments = await this.departmentsService.list();
            if (departments.length > 0) {
                const deptDocs = departments.map((dept) => ({
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
            this.logger.log('📝 Indexing projects...');
            const projects = await this.projectsService.list();
            if (projects.length > 0) {
                const projDocs = projects.map((proj) => {
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
            this.logger.log('📝 Indexing skills...');
            const skills = await this.skillsService.list();
            if (skills.length > 0) {
                const skillDocs = skills.map((skill) => ({
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
            this.logger.log('📝 Indexing positions...');
            const positions = await this.positionsService.list();
            if (positions.length > 0) {
                const posDocs = positions.map((pos) => ({
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
            this.logger.log('📝 Indexing technologies...');
            const technologies = await this.technologiesService.list();
            if (technologies.length > 0) {
                const techDocs = technologies.map((tech) => ({
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
        }
        catch (error) {
            this.logger.error(`❌ Error indexing entities to ChromaDB: ${error}`);
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
        search_service_1.SearchService,
        conversation_history_service_1.ConversationHistoryService,
        redis_conversation_service_1.RedisConversationService,
        ollama_rag_service_1.OllamaRAGService,
        gemini_tools_service_1.GeminiToolsService,
        positions_service_1.PositionsService,
        technologies_service_1.TechnologiesService])
], ChatService);
//# sourceMappingURL=chat.service.js.map