import { Module } from '@nestjs/common';
import { UnitsService } from './units.service';
import { Neo4jModule } from '../core/neo4j/neo4j.module';

@Module({
  imports: [Neo4jModule],
  providers: [UnitsService],
  exports: [UnitsService],
})
export class UnitsModule {}
