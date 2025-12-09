/**
 * @fileoverview App Module - Root Application Module
 * @module app.module
 *
 * Root module của ứng dụng EKG Backend.
 * Import và configure tất cả feature modules.
 *
 * Modules:
 * - Core: Neo4jModule, RedisModule, CacheModule
 * - Auth: AuthModule, UsersModule
 * - Entities: EmployeesModule, ProjectsModule, DepartmentsModule, SkillsModule
 * - Features: ChatModule, AiModule, DocumentsModule
 *
 * @author APTX3107 Team
 */
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { Neo4jModule } from './core/neo4j/neo4j.module';
import { RedisModule } from './core/redis/redis.module';
import { EmployeesModule } from './employees/employees.module';
import { ProjectsModule } from './projects/projects.module';
import { DocumentsModule } from './documents/documents.module';
import { DepartmentsModule } from './departments/departments.module';
import { SkillsModule } from './skills/skills.module';
import { SearchController } from './search/search.controller';
import { ChatModule } from './chat/chat.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

/**
 * Root module của ứng dụng.
 * Configure cache và import tất cả feature modules.
 */
@Module({
  imports: [
    // Cache configuration - in-memory store
    CacheModule.register({
      isGlobal: true,
      ttl: 600, // 10 minutes default TTL
      max: 100, // Max items in cache
    }),
    // Core modules
    Neo4jModule,
    RedisModule,
    // Auth
    AuthModule,
    UsersModule,
    // Entity modules
    EmployeesModule,
    ProjectsModule,
    DocumentsModule,
    DepartmentsModule,
    SkillsModule,
    // Feature modules
    AiModule,
    ChatModule,
  ],
  controllers: [SearchController],
  providers: [],
})
export class AppModule {}
