import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
@Controller('projects')
export class ProjectsController {
  constructor(private svc: ProjectsService) {}

  @Get() list() { return this.svc.list(); }

  @Get(':key/full') full(@Param('key') key: string) { return this.svc.getFull(key); }

 @Post() create(@Body() dto: CreateProjectDto) { return this.svc.create(dto); }
}


