import { Controller, Get, Param, Post, Body, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private svc: ProjectsService) { }

  @Get() list() { return this.svc.list(); }

  @Get(':key/full') full(@Param('key') key: string) { return this.svc.getFull(key); }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateProjectDto) { return this.svc.create(dto); }
}


