import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { AddSkillToEmployeeDto } from './dto/add-skill-to-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Skills')
@Controller('skills')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SkillsController {
  constructor(private svc: SkillsService) { }

  @ApiOperation({ summary: 'Top kỹ năng theo tần suất xuất hiện' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @Get('top') top(@Query('limit') limit?: string) {
    return this.svc.top(Number(limit ?? 10));
  }

  @ApiOperation({ summary: 'Gán kỹ năng cho nhân sự' })
  @Post('add-to-employee')
  @Roles('ADMIN')
  add(@Body() dto: AddSkillToEmployeeDto) {
    return this.svc.addToEmployee(dto);
  }

  @ApiOperation({ summary: 'Kỹ năng liên quan (đồng xuất hiện với kỹ năng đầu vào)' })
  @ApiQuery({ name: 'ten', required: true, example: 'Node.js' })
  @ApiQuery({ name: 'limit', required: false, example: 5 })
  @Get('related') related(@Query('ten') ten: string, @Query('limit') limit?: string) {
    return this.svc.related(ten, Number(limit ?? 5));
  }
}
