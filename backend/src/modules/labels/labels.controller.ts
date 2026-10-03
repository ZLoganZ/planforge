import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LabelsService } from './labels.service.js';
import { CreateLabelDto, UpdateLabelDto } from './dto/labels.dto.js';

@ApiTags('Labels')
@ApiBearerAuth('JWT-auth')
@Controller('labels')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new label' })
  create(@Body() dto: CreateLabelDto) {
    return this.labelsService.create(dto);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'List all labels for a project' })
  findAllByProject(@Param('projectId') projectId: string) {
    return this.labelsService.findAllByProject(projectId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update label' })
  update(@Param('id') id: string, @Body() dto: UpdateLabelDto) {
    return this.labelsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete label' })
  remove(@Param('id') id: string) {
    return this.labelsService.remove(id);
  }
}
