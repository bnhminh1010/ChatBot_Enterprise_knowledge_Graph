import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { Neo4jModule } from '../core/neo4j/neo4j.module';

@Module({
  imports: [Neo4jModule],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
