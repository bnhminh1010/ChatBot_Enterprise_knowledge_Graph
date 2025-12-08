import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { Neo4jModule } from '../core/neo4j/neo4j.module';
import { GraphModule } from '../graph/graph.module'; // Import GraphModule instead

@Module({
  imports: [
    Neo4jModule,
    GraphModule, // No forwardRef needed!
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
