/**
 * @fileoverview Employees Module - Employee Entity Management
 * @module employees/employees.module
 * 
 * Module quản lý Employee entity.
 * Cung cấp CRUD operations và search cho nhân viên.
 * 
 * @author APTX3107 Team
 */
import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { Neo4jModule } from '../core/neo4j/neo4j.module';
import { GraphModule } from '../graph/graph.module';

/**
 * Module quản lý nhân viên.
 */
@Module({
  imports: [
    Neo4jModule,
    GraphModule,
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
