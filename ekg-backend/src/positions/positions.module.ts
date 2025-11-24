import { Module } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { Neo4jModule } from '../core/neo4j/neo4j.module';

@Module({
  imports: [Neo4jModule],
  providers: [PositionsService],
  exports: [PositionsService],
})
export class PositionsModule {}
