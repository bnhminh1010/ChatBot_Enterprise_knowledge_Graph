import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { Neo4jModule } from '../core/neo4j/neo4j.module';

@Module({
  imports: [Neo4jModule],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
