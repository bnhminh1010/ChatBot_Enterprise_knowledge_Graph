/**
 * @fileoverview Skills Module - Skill Entity Management
 * @module skills/skills.module
 * 
 * Module quản lý Skill entity (Kỹ năng).
 * 
 * @author APTX3107 Team
 */
import { Module } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { SkillsController } from './skills.controller';
import { Neo4jModule } from '../core/neo4j/neo4j.module';

@Module({
  imports: [Neo4jModule],
  providers: [SkillsService],
  controllers: [SkillsController],
  exports: [SkillsService],
})
export class SkillsModule {}
