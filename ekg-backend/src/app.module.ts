import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { Neo4jModule } from './core/neo4j/neo4j.module';
import { RedisModule } from './core/redis/redis.module';
import { EmployeesModule } from './employees/employees.module';
import { ProjectsModule } from './projects/projects.module';
import { DepartmentsModule } from './departments/departments.module';
import { SkillsModule } from './skills/skills.module';
import { SearchController } from './search/search.controller';
import { ChatModule } from './chat/chat.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // Cache configuration - in-memory store
    CacheModule.register({
      isGlobal: true, // Make cache available globally
      ttl: 600, // Default TTL: 10 minutes (in seconds)
      max: 100, // Maximum number of items in cache
    }),
    Neo4jModule,
    RedisModule, // Global Redis provider
    AuthModule,
    UsersModule,
    EmployeesModule,
    ProjectsModule,
    DepartmentsModule,
    SkillsModule,
    AiModule,
    ChatModule,
  ],
  controllers: [SearchController],
  providers: [],
})
export class AppModule { }
