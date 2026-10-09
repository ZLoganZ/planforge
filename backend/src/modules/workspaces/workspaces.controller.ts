import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  AddWorkspaceMemberDto,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  UpdateWorkspaceMemberDto,
} from './dto/workspaces.dto.js';
import { WorkspacesService } from './workspaces.service.js';

@ApiTags('workspaces')
@ApiBearerAuth()
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  @ApiOperation({ summary: 'List user workspaces' })
  async findAll(@CurrentUser('id') userId: string) {
    return this.workspacesService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workspace details' })
  async findOne(@Param('id') id: string) {
    return this.workspacesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workspace details' })
  async update(@Param('id') id: string, @Body() dto: UpdateWorkspaceDto) {
    return this.workspacesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workspace' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspacesService.remove(id, userId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get workspace members' })
  async getMembers(@Param('id') id: string) {
    return this.workspacesService.getMembers(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to workspace' })
  async addMember(@Param('id') id: string, @Body() dto: AddWorkspaceMemberDto) {
    return this.workspacesService.addMember(id, dto);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({ summary: 'Update workspace member role' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') memberUserId: string,
    @Body() dto: UpdateWorkspaceMemberDto,
  ) {
    return this.workspacesService.updateMemberRole(id, memberUserId, dto);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from workspace' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') memberUserId: string,
  ) {
    return this.workspacesService.removeMember(id, memberUserId);
  }
}
