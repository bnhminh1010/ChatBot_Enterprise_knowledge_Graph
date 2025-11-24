import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { Neo4jModule } from '../core/neo4j/neo4j.module';

@Module({
  imports: [Neo4jModule],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
