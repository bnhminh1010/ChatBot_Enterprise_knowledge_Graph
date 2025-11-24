import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { Neo4jModule } from '../core/neo4j/neo4j.module'; // <-- import Neo4jModule

@Module({
  imports: [Neo4jModule],   // <-- thêm Neo4jModule vào imports
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
