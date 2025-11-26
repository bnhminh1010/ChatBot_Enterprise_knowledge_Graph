import { Module } from '@nestjs/common';
import { OllamaService } from './ollama.service';
import { GeminiService } from './gemini.service';
import { QueryClassifierService } from './query-classifier.service';
import { ChromaDBService } from './chroma-db.service';
import { Neo4jModule } from '../core/neo4j/neo4j.module';
import { GeminiToolsService } from './gemini-tools.service';
import { PositionsModule } from '../positions/positions.module';
import { TechnologiesModule } from '../technologies/technologies.module';
import { EmployeesModule } from '../employees/employees.module';
import { DepartmentsModule } from '../departments/departments.module';
import { ProjectsModule } from '../projects/projects.module';
import { SkillsModule } from '../skills/skills.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [
    Neo4jModule,
    PositionsModule,
    TechnologiesModule,
    EmployeesModule,
    DepartmentsModule,
    ProjectsModule,
    SkillsModule,
    DocumentsModule,
  ],
  providers: [
    OllamaService,
    GeminiService,
    QueryClassifierService,
    ChromaDBService,
    GeminiToolsService,
  ],
  exports: [
    OllamaService,
    GeminiService,
    QueryClassifierService,
    ChromaDBService,
    GeminiToolsService,
  ],
})
export class AiModule { }
