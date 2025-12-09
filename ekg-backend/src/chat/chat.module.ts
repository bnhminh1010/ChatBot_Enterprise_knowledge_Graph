/**
 * @fileoverview Chat Module - Chatbot Core Orchestration
 * @module chat/chat.module
 * 
 * Module chính quản lý chatbot functionality.
 * Kết hợp AI services, entity services, và các utility services.
 * 
 * Components:
 * - Controllers: ChatController, ConversationsController
 * - Core: ChatService (xử lý query chính)
 * - Cache: CacheService, QueryCacheService, ContextCacheService
 * - Context: ContextCompressionService, DatabaseContextService
 * - History: ConversationHistoryService, RedisConversationService
 * - RAG: OllamaRAGService, ChromaIndexingService
 * - Analysis: QueryAnalyzerService
 * - User: UserPreferenceService, SuggestedQuestionsService
 * - Data: GraphDataExtractor, RecommendationService
 * 
 * @author APTX3107 Team
 */
import { Module, forwardRef } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ConversationsController } from './controllers/conversations.controller';
import { ChatService } from './chat.service';
import { CacheService } from './services/cache.service';
import { MetricsService } from './services/metrics.service';
import { ConversationHistoryService } from './services/conversation-history.service';
import { RedisConversationService } from './services/redis-conversation.service';
import { OllamaRAGService } from './services/ollama-rag.service';
import { ChromaIndexingService } from './services/chroma-indexing.service';
import { UploadIntentHandlerService } from './services/upload-intent-handler.service';
import { QueryAnalyzerService } from './services/query-analyzer.service';
import { QueryCacheService } from './services/query-cache.service';
import { ContextCacheService } from './services/context-cache.service';
import { ContextCompressionService } from './services/context-compression.service';
import { UserPreferenceService } from './services/user-preference.service';
import { SuggestedQuestionsService } from './services/suggested-questions.service';
import { DatabaseContextService } from './services/database-context.service';
import { GraphDataExtractor } from './services/graph-data-extractor.service';
import { RecommendationService } from './services/recommendation.service';
import { SchedulerService } from './services/scheduler.service';
import { AiModule } from '../ai/ai.module';
import { EmployeesModule } from '../employees/employees.module';
import { SkillsModule } from '../skills/skills.module';
import { DepartmentsModule } from '../departments/departments.module';
import { ProjectsModule } from '../projects/projects.module';
import { SearchModule } from '../search/search.module';
import { Neo4jModule } from '../core/neo4j/neo4j.module';
import { PositionsModule } from '../positions/positions.module';
import { TechnologiesModule } from '../technologies/technologies.module';
import { DocumentsModule } from '../documents/documents.module';

/**
 * Module quản lý toàn bộ chatbot functionality.
 * Là module trung tâm kết nối AI, data, và user interface.
 */
@Module({
  imports: [
    AiModule,
    EmployeesModule,
    SkillsModule,
    DepartmentsModule,
    forwardRef(() => ProjectsModule), // Break circular dependency
    SearchModule,
    Neo4jModule,
    PositionsModule,
    TechnologiesModule,
    DocumentsModule,
  ],
  controllers: [ChatController, ConversationsController],
  providers: [
    // Core
    ChatService,
    // Cache & Performance
    CacheService,
    MetricsService,
    QueryCacheService,
    ContextCacheService,
    ContextCompressionService,
    // Conversation Management
    ConversationHistoryService,
    RedisConversationService,
    // RAG & Indexing
    OllamaRAGService,
    ChromaIndexingService,
    // Query Processing
    QueryAnalyzerService,
    UploadIntentHandlerService,
    // User Experience
    UserPreferenceService,
    SuggestedQuestionsService,
    // Data Services
    DatabaseContextService,
    GraphDataExtractor,
    RecommendationService,
    SchedulerService,
  ],
  exports: [
    ChatService,
    GraphDataExtractor,
    QueryCacheService,
    QueryAnalyzerService,
    ContextCompressionService,
    UserPreferenceService,
    SuggestedQuestionsService,
    DatabaseContextService,
    RecommendationService,
    SchedulerService,
  ],
})
export class ChatModule {}
