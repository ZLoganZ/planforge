import { Controller, Get, Post, Patch, Delete, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ProjectsService } from './projects.service.js';
import {
  CreateProjectDto,
  QueryProjectsDto,
  UpdateProjectDto,
  AddProjectMemberDto,
  UpdateProjectMemberDto,
} from './dto/projects.dto.js';
import { CurrentUser, Roles } from '../../common/decorators/index.js';

@ApiTags('Projects')
@ApiBearerAuth('JWT-auth')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  findAll(@Query() query: QueryProjectsDto) {
    return this.projectsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update project' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Delete project' })
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List project members' })
  listMembers(@Param('id') id: string) {
    return this.projectsService.listMembers(id);
  }

  @Post(':id/members')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Add member to project' })
  addMember(@Param('id') id: string, @Body() dto: AddProjectMemberDto) {
    return this.projectsService.addMember(id, dto);
  }

  @Patch(':id/members/:userId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update project member role' })
  updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateProjectMemberDto,
  ) {
    return this.projectsService.updateMemberRole(id, userId, dto);
  }

  @Delete(':id/members/:userId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove member from project' })
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.projectsService.removeMember(id, userId);
  }
}

