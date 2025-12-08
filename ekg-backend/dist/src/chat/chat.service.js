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
const ollama_service_1 = require("../ai/ollama.service");
const chroma_db_service_1 = require("../ai/chroma-db.service");
const gemini_service_1 = require("../ai/gemini.service");
const openrouter_service_1 = require("../ai/openrouter.service");
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
const upload_intent_handler_service_1 = require("./services/upload-intent-handler.service");
const context_compression_service_1 = require("./services/context-compression.service");
const user_preference_service_1 = require("./services/user-preference.service");
const suggested_questions_service_1 = require("./services/suggested-questions.service");
const database_context_service_1 = require("./services/database-context.service");
let ChatService = ChatService_1 = class ChatService {
    ollamaService;
    chromaDBService;
    geminiService;
    openRouterService;
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
    uploadIntentHandler;
    contextCompressionService;
    userPreferenceService;
    suggestedQuestionsService;
    databaseContextService;
    logger = new common_1.Logger(ChatService_1.name);
    constructor(ollamaService, chromaDBService, geminiService, openRouterService, employeesService, skillsService, departmentsService, projectsService, searchService, conversationHistoryService, redisConversationService, ollamaRAGService, geminiToolsService, positionsService, technologiesService, uploadIntentHandler, contextCompressionService, userPreferenceService, suggestedQuestionsService, databaseContextService) {
        this.ollamaService = ollamaService;
        this.chromaDBService = chromaDBService;
        this.geminiService = geminiService;
        this.openRouterService = openRouterService;
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
        this.uploadIntentHandler = uploadIntentHandler;
        this.contextCompressionService = contextCompressionService;
        this.userPreferenceService = userPreferenceService;
        this.suggestedQuestionsService = suggestedQuestionsService;
        this.databaseContextService = databaseContextService;
    }
    async processQuery(message, conversationId, userId) {
        const startTime = Date.now();
        try {
            let activeConversationId = conversationId;
            try {
                const effectiveUserId = userId || 'anonymous';
                activeConversationId =
                    await this.redisConversationService.getOrCreateConversation(effectiveUserId, conversationId);
                this.logger.debug(`Using conversation: ${activeConversationId}`);
            }
            catch (error) {
                this.logger.warn(`Could not create/get conversation: ${error}`);
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
            if (this.uploadIntentHandler.hasUploadIntent(message)) {
                this.logger.log('🔍 Detected upload intent');
                const uploadResponse = await this.uploadIntentHandler.handleUploadIntent(message);
                if (uploadResponse) {
                    const responseStr = uploadResponse.type === 'upload_prompt'
                        ? JSON.stringify(uploadResponse)
                        : uploadResponse.content;
                    if (activeConversationId) {
                        await this.redisConversationService.addMessage(activeConversationId, 'assistant', responseStr);
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
                        const history = await this.redisConversationService.getConversationContext(activeConversationId, 3);
                        const lastAssistantMsg = history
                            .reverse()
                            .find((m) => m.role === 'assistant' && m.content.includes('Bạn có muốn'));
                        if (lastAssistantMsg) {
                            this.logger.log('🔄 Detected confirmation for prompt in previous message');
                            let followUpQuery = '';
                            if (lastAssistantMsg.content.includes('dự án')) {
                                const projectMatch = lastAssistantMsg.content.match(/dự án\s+([A-Z0-9]+)/i);
                                if (projectMatch) {
                                    followUpQuery = `Thông tin về dự án ${projectMatch[1]}`;
                                }
                            }
                            else if (lastAssistantMsg.content.includes('phòng ban')) {
                                const deptMatch = lastAssistantMsg.content.match(/phòng\s+(\w+)/i);
                                if (deptMatch) {
                                    followUpQuery = `Thông tin phòng ${deptMatch[1]}`;
                                }
                            }
                            else if (lastAssistantMsg.content.includes('nhân viên')) {
                                const empMatch = lastAssistantMsg.content.match(/nhân viên\s+(.+?)\s+/i);
                                if (empMatch) {
                                    followUpQuery = `Thông tin nhân viên ${empMatch[1]}`;
                                }
                            }
                            if (followUpQuery) {
                                this.logger.log(`📝 Rewriting query: "${message}" → "${followUpQuery}"`);
                                message = followUpQuery;
                            }
                            else {
                                this.logger.log('Using generic follow-up handler');
                                message = lastAssistantMsg.content
                                    .replace(/Bạn có muốn.+?\?/g, '')
                                    .trim();
                                if (message.includes('Không tìm thấy')) {
                                    const entityMatch = message.match(/Không tìm thấy (.+?)\./);
                                    if (entityMatch) {
                                        message = `Thông tin về ${entityMatch[1]}`;
                                    }
                                }
                            }
                        }
                    }
                    catch (err) {
                        this.logger.warn(`Could not process confirmation: ${err}`);
                    }
                }
            }
            this.logger.log('📦 Sending 33 tools to Gemini: universal_search, search_employees_by_name, search_employees_by_level, search_employees_by_email, search_employees_by_phone, search_employees_by_status, get_employee_by_id, count_employees, search_employees_by_department, search_employees_advanced, search_positions_by_name, search_positions_by_level, search_positions_by_group, count_positions, search_departments_by_name, search_departments_by_code, get_department_by_id, count_departments, search_projects_by_name, search_projects_by_client, search_projects_by_status, search_projects_by_field, search_projects_by_type, get_project_by_id, count_projects, get_project_manager, search_technologies_by_name, search_technologies_by_type, count_technologies, list_skills, get_document_content, list_project_documents, search_documents');
            response = await this.handleComplexQuery('agent-search', undefined, message, activeConversationId, userId);
            const processingTime = Date.now() - startTime;
            if (activeConversationId) {
                try {
                    await this.redisConversationService.addMessage(activeConversationId, 'assistant', response, {
                        queryType: 'agent-search',
                        queryLevel: 'agent',
                        processingTime,
                    });
                }
                catch (error) {
                    this.logger.warn(`Could not save assistant response: ${error}`);
                }
            }
            let suggestedQuestions = [];
            try {
                const suggestions = this.suggestedQuestionsService.generateQuickSuggestions('agent-search', []);
                suggestedQuestions = suggestions.map((s) => ({
                    question: s.question,
                    category: s.category,
                }));
            }
            catch (error) {
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
                    const result = await this.employeesService.findBySkill(filters.skill);
                    employees = result.employees;
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
    async handleComplexQuery(type, value, message, conversationId, userId) {
        try {
            let conversationHistory = [];
            let contextSummary = '';
            this.logger.debug(`🔍 handleComplexQuery - conversationId: ${conversationId || 'NOT PROVIDED'}`);
            if (conversationId) {
                try {
                    const messages = await this.redisConversationService.getConversationContext(conversationId, 20);
                    this.logger.debug(`🔍 Got ${messages.length} messages from Redis for conversation ${conversationId}`);
                    const compressed = await this.contextCompressionService.compressContext(messages);
                    contextSummary = compressed.summary;
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
                        role: m.role,
                        content: m.content,
                    }));
                    this.logger.debug(`Context compressed: ${messages.length} messages → ` +
                        `${compressed.recentMessages.length} recent + summary (${compressed.tokenEstimate} tokens)`);
                }
                catch (error) {
                    this.logger.warn(`Could not retrieve conversation context: ${error}`);
                }
            }
            if (userId) {
                try {
                    const topic = type.split('-')[0];
                    await this.userPreferenceService.recordQuery(userId, message, [], topic);
                }
                catch (error) {
                    this.logger.warn(`Could not record user preference: ${error}`);
                }
            }
            const tools = this.geminiToolsService.getTools();
            this.logger.log(`📦 Sending ${tools.length} tools to Gemini: ${tools.map((t) => t.name).join(', ')}`);
            let conversationContext = '';
            if (contextSummary) {
                conversationContext = `\n📋 TÓM TẮT: ${contextSummary}\n`;
            }
            if (conversationHistory.length > 0) {
                const recentChat = conversationHistory
                    .slice(-6)
                    .map((m, idx) => `[${idx + 1}] ${m.role === 'user' ? '👤 User' : '🤖 Bot'}: ${m.content.substring(0, 250)}`)
                    .join('\n');
                conversationContext += `\n📝 LỊCH SỬ HỘI THOẠI:\n${recentChat}\n`;
                const entityPatterns = [
                    /dự án[:\s]*[""]?([^""]+?)[""]?(?:\.|,|\s|$)/gi,
                    /nhân viên:?\s*[""]?([^""]+?)[""]?(?:\.|,|\s|$)/gi,
                    /phòng ban:?\s*[""]?([^""]+?)[""]?(?:\.|,|\s|$)/gi,
                    /tên[:\s]*[""]?([^""]+?)[""]?(?:\.|,|\s|$)/gi,
                ];
                const mentionedEntities = [];
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
                this.logger.debug(`🔍 Conversation history (${conversationHistory.length} msgs): ${recentChat.substring(0, 300)}`);
            }
            else {
                this.logger.debug('🔍 No conversation history available');
            }
            let databaseContext = '';
            try {
                databaseContext = await this.databaseContextService.getAgentContext();
                if (databaseContext) {
                    databaseContext = `\n${databaseContext}\n`;
                }
            }
            catch (error) {
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
            if (error.message?.includes('429') ||
                error.message?.includes('quota') ||
                error.message?.includes('Too Many Requests') ||
                error.message?.includes('exceeded')) {
                this.logger.warn('⚠️ Gemini quota exceeded, trying OpenRouter fallback...');
                try {
                    if (this.openRouterService.isAvailable()) {
                        this.logger.log('🔄 Using OpenRouter as fallback (Gemini quota exceeded)');
                        let openRouterHistory = [];
                        if (conversationId) {
                            try {
                                const messages = await this.redisConversationService.getConversationContext(conversationId, 5);
                                openRouterHistory = messages
                                    .filter((m) => m.role === 'user' || m.role === 'assistant')
                                    .map((m) => ({
                                    role: m.role,
                                    content: m.content,
                                }));
                            }
                            catch (e) {
                            }
                        }
                        const openRouterContext = 'Bạn là trợ lý AI thông minh cho hệ thống EKG. Trả lời câu hỏi về nhân sự, dự án, phòng ban trong tổ chức. Trả lời bằng tiếng Việt tự nhiên.';
                        const openRouterResponse = await this.openRouterService.generateResponse(message, openRouterContext);
                        if (openRouterResponse && openRouterResponse.trim()) {
                            return `🔄 *[OpenRouter Fallback]*\n\n${openRouterResponse}`;
                        }
                    }
                }
                catch (openRouterError) {
                    this.logger.warn(`OpenRouter fallback failed: ${openRouterError.message}`);
                    if (!openRouterError.message?.includes('429') &&
                        !openRouterError.message?.includes('quota')) {
                        this.logger.error(`OpenRouter error (non-quota): ${openRouterError.message}`);
                    }
                }
                this.logger.warn('⚠️ OpenRouter also failed, trying Ollama RAG...');
                try {
                    const ollamaAvailable = await this.ollamaRAGService.isAvailable();
                    if (ollamaAvailable) {
                        this.logger.log('🔄 Using Ollama RAG as final fallback');
                        let ollamaHistory = [];
                        if (conversationId) {
                            try {
                                const messages = await this.redisConversationService.getConversationContext(conversationId, 5);
                                ollamaHistory = messages
                                    .filter((m) => m.role === 'user' || m.role === 'assistant')
                                    .map((m) => ({
                                    role: m.role,
                                    content: m.content,
                                }));
                            }
                            catch (e) {
                            }
                        }
                        const ollamaResponse = await this.ollamaRAGService.queryWithRAG(message, 'employees', 10, ollamaHistory);
                        return `🔄 *[Ollama Fallback - All APIs quota hết]*\n\n${ollamaResponse}`;
                    }
                    else {
                        this.logger.warn('Ollama is not available for fallback');
                    }
                }
                catch (ollamaError) {
                    this.logger.error(`Ollama fallback also failed: ${ollamaError}`);
                }
                return 'Xin lỗi, hệ thống đang quá tải. Vui lòng thử lại sau.';
            }
            if (error.message?.includes('model output must contain either output text or tool calls') ||
                error.message?.includes('empty')) {
                return 'Xin lỗi, tôi không thể xử lý yêu cầu này. Vui lòng thử lại với câu hỏi đơn giản hơn.';
            }
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
    __metadata("design:paramtypes", [ollama_service_1.OllamaService,
        chroma_db_service_1.ChromaDBService,
        gemini_service_1.GeminiService,
        openrouter_service_1.OpenRouterService,
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
        technologies_service_1.TechnologiesService,
        upload_intent_handler_service_1.UploadIntentHandlerService,
        context_compression_service_1.ContextCompressionService,
        user_preference_service_1.UserPreferenceService,
        suggested_questions_service_1.SuggestedQuestionsService,
        database_context_service_1.DatabaseContextService])
], ChatService);
//# sourceMappingURL=chat.service.js.map