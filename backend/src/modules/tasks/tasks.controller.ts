import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { stringify } from 'csv-stringify/sync';
import type { Response } from 'express';

import { CurrentUser } from '../../common/decorators/index.js';
import {
  BulkUpdateTasksDto,
  CreateTaskDto,
  QueryTasksDto,
  ReorderTasksDto,
  UpdateTaskDto,
} from './dto/tasks.dto.js';
import { TasksService } from './tasks.service.js';

@ApiTags('Tasks')
@ApiBearerAuth('JWT-auth')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  create(@CurrentUser('id') reporterId: string, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(reporterId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tasks with advanced filtering' })
  findAll(@Query() query: QueryTasksDto) {
    return this.tasksService.findAll(query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export tasks as CSV' })
  async exportCsv(@Query() query: QueryTasksDto, @Res() res: Response) {
    // Fetch all tasks matching the filters (up to 5000 for export)
    const { items } = await this.tasksService.findAll({
      ...query,
      limit: 5000,
      page: 1,
    });

    const rows = items.map((task: any) => ({
      'Task Key': task.project
        ? `${task.project.key}-${task.taskNumber}`
        : `#${task.taskNumber}`,
      Title: task.title,
      Status: task.status,
      Priority: task.priority,
      'Story Points': task.storyPoints ?? '',
      Assignee: task.assignee
        ? `${task.assignee.firstName} ${task.assignee.lastName}`
        : 'Unassigned',
      Sprint: task.sprint?.name ?? '',
      'Due Date': task.dueDate
        ? new Date(task.dueDate).toISOString().split('T')[0]
        : '',
      'Created At': new Date(task.createdAt).toISOString().split('T')[0],
      Project: task.project?.name ?? '',
    }));

    const csv = stringify(rows, { header: true });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tasks-export-${Date.now()}.csv"`,
    );
    res.send(csv);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder tasks position / status' })
  reorder(@Body() dto: ReorderTasksDto, @CurrentUser('id') userId?: string) {
    return this.tasksService.reorder(dto, userId);
  }

  @Patch('bulk')
  @ApiOperation({ summary: 'Bulk update tasks' })
  bulkUpdate(@Body() dto: BulkUpdateTasksDto) {
    return this.tasksService.bulkUpdate(dto);
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Bulk delete tasks' })
  bulkDelete(@Body('taskIds') taskIds: string[]) {
    return this.tasksService.bulkDelete(taskIds || []);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete task' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.tasksService.softDelete(id, userId);
  }
}
