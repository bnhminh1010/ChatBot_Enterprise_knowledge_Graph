/**
 * @fileoverview Projects Module - Project Entity Management
 * @module projects/projects.module
 *
 * Module quản lý Project entity (Dự án).
 * Sử dụng forwardRef để xử lý circular dependency với ChatModule.
 *
 * @author APTX3107 Team
 */
import { Module, forwardRef } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Neo4jModule } from '../core/neo4j/neo4j.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [Neo4jModule, forwardRef(() => ChatModule)],
  providers: [ProjectsService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
