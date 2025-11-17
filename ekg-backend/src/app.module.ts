import { Module } from '@nestjs/common';
import { Neo4jModule } from './core/neo4j/neo4j.module';
import { EmployeesModule } from './employees/employees.module';
import { ProjectsModule } from './projects/projects.module';
import { DepartmentsModule } from './departments/departments.module';
import { SkillsModule } from './skills/skills.module';
import { AuthModule } from './auth/auth.module';
import { SearchController } from './search/search.controller';

@Module({
  imports: [
    Neo4jModule,
    AuthModule,
    EmployeesModule,
    ProjectsModule,
    DepartmentsModule,
    SkillsModule,
  ],
  controllers: [SearchController],
  providers: [],
})
export class AppModule {}
