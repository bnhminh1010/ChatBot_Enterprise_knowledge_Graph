// src/employees/employees.controller.ts
import {
  Controller, Get, Param, Post, Body, Query,
  DefaultValuePipe, ParseIntPipe, UseGuards
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private svc: EmployeesService) { }

  // GET /employees?skip=&limit=
  @Get()
  list(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.svc.list(skip, limit);
  }

  // ⚠️ đặt trước /:empId để không bị nuốt bởi param
  @Get('analytics/top-skills')
  top(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ) {
    return this.svc.topSkills(limit);
  }

  @Get(':empId')
  get(@Param('empId') empId: string) {
    return this.svc.get(empId);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateEmployeeDto) {
    return this.svc.create(dto);
  }
}
