import { Controller, Get, Param, Post, Body, Put, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@ApiTags('Departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private svc: DepartmentsService) {}

  @ApiOperation({ summary: 'Danh sách phòng ban' })
  @Get() list() { return this.svc.list(); }

  @ApiOperation({ summary: 'Lấy phòng ban theo code' })
  @ApiParam({ name: 'code', example: 'ENG' })
  @Get(':code') get(@Param('code') code: string) { return this.svc.get(code); }

  @ApiOperation({ summary: 'Tạo phòng ban mới' })
  @ApiResponse({ status: 201, description: 'Created' })
  @Post() create(@Body() dto: CreateDepartmentDto) { return this.svc.create(dto); }

  @ApiOperation({ summary: 'Cập nhật phòng ban' })
  @ApiParam({ name: 'code', example: 'ENG' })
  @Put(':code') update(@Param('code') code: string, @Body() dto: UpdateDepartmentDto) {
    return this.svc.update(code, dto);
  }

  @ApiOperation({ summary: 'Xóa phòng ban' })
  @ApiParam({ name: 'code', example: 'ENG' })
  @Delete(':code') remove(@Param('code') code: string) { return this.svc.remove(code); }
}
