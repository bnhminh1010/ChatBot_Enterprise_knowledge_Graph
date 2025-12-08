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
const chroma_indexing_service_1 = require("./services/chroma-indexing.service");
const upload_intent_handler_service_1 = require("./services/upload-intent-handler.service");
const query_analyzer_service_1 = require("./services/query-analyzer.service");
const query_cache_service_1 = require("./services/query-cache.service");
const context_cache_service_1 = require("./services/context-cache.service");
const context_compression_service_1 = require("./services/context-compression.service");
const user_preference_service_1 = require("./services/user-preference.service");
const suggested_questions_service_1 = require("./services/suggested-questions.service");
const database_context_service_1 = require("./services/database-context.service");
const graph_data_extractor_service_1 = require("./services/graph-data-extractor.service");
const recommendation_service_1 = require("./services/recommendation.service");
const scheduler_service_1 = require("./services/scheduler.service");
const ai_module_1 = require("../ai/ai.module");
const employees_module_1 = require("../employees/employees.module");
const skills_module_1 = require("../skills/skills.module");
const departments_module_1 = require("../departments/departments.module");
const projects_module_1 = require("../projects/projects.module");
const search_module_1 = require("../search/search.module");
const neo4j_module_1 = require("../core/neo4j/neo4j.module");
const positions_module_1 = require("../positions/positions.module");
const technologies_module_1 = require("../technologies/technologies.module");
const documents_module_1 = require("../documents/documents.module");
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
            (0, common_1.forwardRef)(() => projects_module_1.ProjectsModule),
            search_module_1.SearchModule,
            neo4j_module_1.Neo4jModule,
            positions_module_1.PositionsModule,
            technologies_module_1.TechnologiesModule,
            documents_module_1.DocumentsModule,
        ],
        controllers: [chat_controller_1.ChatController, conversations_controller_1.ConversationsController],
        providers: [
            chat_service_1.ChatService,
            cache_service_1.CacheService,
            metrics_service_1.MetricsService,
            conversation_history_service_1.ConversationHistoryService,
            redis_conversation_service_1.RedisConversationService,
            ollama_rag_service_1.OllamaRAGService,
            chroma_indexing_service_1.ChromaIndexingService,
            upload_intent_handler_service_1.UploadIntentHandlerService,
            query_analyzer_service_1.QueryAnalyzerService,
            query_cache_service_1.QueryCacheService,
            context_cache_service_1.ContextCacheService,
            context_compression_service_1.ContextCompressionService,
            user_preference_service_1.UserPreferenceService,
            suggested_questions_service_1.SuggestedQuestionsService,
            database_context_service_1.DatabaseContextService,
            graph_data_extractor_service_1.GraphDataExtractor,
            recommendation_service_1.RecommendationService,
            scheduler_service_1.SchedulerService,
        ],
        exports: [
            chat_service_1.ChatService,
            graph_data_extractor_service_1.GraphDataExtractor,
            query_cache_service_1.QueryCacheService,
            query_analyzer_service_1.QueryAnalyzerService,
            context_compression_service_1.ContextCompressionService,
            user_preference_service_1.UserPreferenceService,
            suggested_questions_service_1.SuggestedQuestionsService,
            database_context_service_1.DatabaseContextService,
            recommendation_service_1.RecommendationService,
            scheduler_service_1.SchedulerService,
        ],
    })
], ChatModule);
//# sourceMappingURL=chat.module.js.map