import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AiModule } from '../ai/ai.module';
import { EmployeesModule } from '../employees/employees.module';
import { SkillsModule } from '../skills/skills.module';
import { DepartmentsModule } from '../departments/departments.module';
import { ProjectsModule } from '../projects/projects.module';
import { SearchModule } from '../search/search.module';
import { Neo4jModule } from '../core/neo4j/neo4j.module';

@Module({
  imports: [
    AiModule,
    EmployeesModule,
    SkillsModule,
    DepartmentsModule,
    ProjectsModule,
    SearchModule,
    Neo4jModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
