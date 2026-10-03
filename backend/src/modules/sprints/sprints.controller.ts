import { Controller, Get, Post, Patch, Delete, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SprintsService } from './sprints.service.js';
import { CreateSprintDto, QuerySprintsDto, UpdateSprintDto } from './dto/sprints.dto.js';

@ApiTags('Sprints')
@ApiBearerAuth('JWT-auth')
@Controller('sprints')
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new sprint' })
  create(@Body() dto: CreateSprintDto) {
    return this.sprintsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List sprints for project' })
  findAll(@Query() query: QuerySprintsDto) {
    return this.sprintsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sprint by ID with tasks and metrics' })
  findOne(@Param('id') id: string) {
    return this.sprintsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update sprint details' })
  update(@Param('id') id: string, @Body() dto: UpdateSprintDto) {
    return this.sprintsService.update(id, dto);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a sprint' })
  start(@Param('id') id: string) {
    return this.sprintsService.start(id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete a sprint' })
  complete(@Param('id') id: string) {
    return this.sprintsService.complete(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a sprint (tasks unlinked to backlog)' })
  remove(@Param('id') id: string) {
    return this.sprintsService.remove(id);
  }
}
