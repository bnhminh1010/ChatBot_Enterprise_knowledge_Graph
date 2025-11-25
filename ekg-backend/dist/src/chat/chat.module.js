"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModule = void 0;
const common_1 = require("@nestjs/common");
const chat_controller_1 = require("./chat.controller");
const conversations_controller_1 = require("./controllers/conversations.controller");
const chat_service_1 = require("./chat.service");
const cache_service_1 = require("./services/cache.service");
const metrics_service_1 = require("./services/metrics.service");
const conversation_history_service_1 = require("./services/conversation-history.service");
const redis_conversation_service_1 = require("./services/redis-conversation.service");
const ollama_rag_service_1 = require("./services/ollama-rag.service");
const ai_module_1 = require("../ai/ai.module");
const employees_module_1 = require("../employees/employees.module");
const skills_module_1 = require("../skills/skills.module");
const departments_module_1 = require("../departments/departments.module");
const projects_module_1 = require("../projects/projects.module");
const search_module_1 = require("../search/search.module");
const neo4j_module_1 = require("../core/neo4j/neo4j.module");
const positions_module_1 = require("../positions/positions.module");
const technologies_module_1 = require("../technologies/technologies.module");
let ChatModule = class ChatModule {
};
exports.ChatModule = ChatModule;
exports.ChatModule = ChatModule = __decorate([
    (0, common_1.Module)({
        imports: [
            ai_module_1.AiModule,
            employees_module_1.EmployeesModule,
            skills_module_1.SkillsModule,
            departments_module_1.DepartmentsModule,
            projects_module_1.ProjectsModule,
            search_module_1.SearchModule,
            neo4j_module_1.Neo4jModule,
            positions_module_1.PositionsModule,
            technologies_module_1.TechnologiesModule,
        ],
        controllers: [chat_controller_1.ChatController, conversations_controller_1.ConversationsController],
        providers: [
            chat_service_1.ChatService,
            cache_service_1.CacheService,
            metrics_service_1.MetricsService,
            conversation_history_service_1.ConversationHistoryService,
            redis_conversation_service_1.RedisConversationService,
            ollama_rag_service_1.OllamaRAGService,
        ],
        exports: [chat_service_1.ChatService],
    })
], ChatModule);
//# sourceMappingURL=chat.module.js.map