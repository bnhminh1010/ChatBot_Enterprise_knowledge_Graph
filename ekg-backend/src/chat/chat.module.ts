import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { CacheService } from './services/cache.service';
import { MetricsService } from './services/metrics.service';
import { ConversationHistoryService } from './services/conversation-history.service';
import { RedisConversationService } from './services/redis-conversation.service';
import { OllamaRAGService } from './services/ollama-rag.service';
import { AiModule } from '../ai/ai.module';
import { EmployeesModule } from '../employees/employees.module';
import { SkillsModule } from '../skills/skills.module';
import { DepartmentsModule } from '../departments/departments.module';
import { ProjectsModule } from '../projects/projects.module';
import { SearchModule } from '../search/search.module';
import { Neo4jModule } from '../core/neo4j/neo4j.module';
import { PositionsModule } from '../positions/positions.module';
import { TechnologiesModule } from '../technologies/technologies.module';

@Module({
  imports: [
    AiModule,
    EmployeesModule,
    SkillsModule,
    DepartmentsModule,
    ProjectsModule,
    SearchModule,
    Neo4jModule,
    PositionsModule,
    TechnologiesModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    CacheService,
    MetricsService,
    ConversationHistoryService,
    RedisConversationService,
    OllamaRAGService,
  ],
  exports: [ChatService],
})
export class ChatModule {}
