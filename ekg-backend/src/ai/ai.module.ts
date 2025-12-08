/**
 * @fileoverview AI Module - AI Services Orchestration
 * @module ai/ai.module
 *
 * Module tổng hợp tất cả AI-related services.
 * Import các dependencies và export các services cho các module khác sử dụng.
 *
 * Services bao gồm:
 * - LLM Services: OllamaService, GeminiService, OpenRouterService
 * - Classification: QueryClassifierService
 * - Vector DB: ChromaDBService
 * - Document Processing: DocumentChunkingService
 * - Function Calling: GeminiToolsService
 * - Agent: AgentPlannerService, AgentExecutorService, AgentMemoryService
 *
 * @author APTX3107 Team
 */
import { Module, forwardRef } from '@nestjs/common';
import { OllamaService } from './ollama.service';
import { GeminiService } from './gemini.service';
import { OpenRouterService } from './openrouter.service';
import { QueryClassifierService } from './query-classifier.service';
import { ChromaDBService } from './chroma-db.service';
import { Neo4jModule } from '../core/neo4j/neo4j.module';
import { RedisModule } from '../core/redis/redis.module';
import { GeminiToolsService } from './gemini-tools.service';
import { PositionsModule } from '../positions/positions.module';
import { TechnologiesModule } from '../technologies/technologies.module';
import { EmployeesModule } from '../employees/employees.module';
import { DepartmentsModule } from '../departments/departments.module';
import { ProjectsModule } from '../projects/projects.module';
import { SkillsModule } from '../skills/skills.module';
import { DocumentsModule } from '../documents/documents.module';
import { DocumentChunkingService } from './document-chunking.service';
// Agent services
import { AgentPlannerService } from './agent/agent-planner.service';
import { AgentExecutorService } from './agent/agent-executor.service';
import { AgentMemoryService } from './agent/agent-memory.service';

/**
 * Module quản lý tất cả AI services.
 * Sử dụng forwardRef để xử lý circular dependencies.
 */
@Module({
  imports: [
    Neo4jModule,
    RedisModule,
    PositionsModule,
    TechnologiesModule,
    EmployeesModule,
    DepartmentsModule,
    forwardRef(() => ProjectsModule), // Break circular dependency
    SkillsModule,
    DocumentsModule,
    forwardRef(() => require('../chat/chat.module').ChatModule), // For QueryCacheService
  ],
  providers: [
    // LLM Services
    OllamaService,
    GeminiService,
    OpenRouterService,
    // Classification
    QueryClassifierService,
    // Vector DB & Document Processing
    ChromaDBService,
    DocumentChunkingService,
    GeminiToolsService,
    // Agent Services
    AgentPlannerService,
    AgentExecutorService,
    AgentMemoryService,
  ],
  exports: [
    // LLM Services
    OllamaService,
    GeminiService,
    OpenRouterService,
    // Classification
    QueryClassifierService,
    // Vector DB & Document Processing
    ChromaDBService,
    DocumentChunkingService,
    GeminiToolsService,
    // Agent Services
    AgentPlannerService,
    AgentExecutorService,
    AgentMemoryService,
  ],
})
export class AiModule {}
