import { Module } from '@nestjs/common';
import { Neo4jModule } from './core/neo4j/neo4j.module';
import { EmployeesModule } from './employees/employees.module';
import { ProjectsModule } from './projects/projects.module';
import { DepartmentsModule } from './departments/departments.module';
import { SkillsModule } from './skills/skills.module';
import { SearchController } from './search/search.controller';
import { ChatModule } from './chat/chat.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    Neo4jModule,
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
export class AppModule {}
