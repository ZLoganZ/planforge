import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit, CurrentUser } from '../../common/decorators/index.js';
import { CommentsService } from './comments.service.js';
import { CreateCommentDto } from './dto/comments.dto.js';

@ApiTags('comments')
@ApiBearerAuth()
@Audit({ skip: true })
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('tasks/:taskId/comments')
  @ApiOperation({ summary: 'Add a comment to a task' })
  async create(
    @Param('taskId') taskId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(taskId, userId, dto);
  }

  @Get('tasks/:taskId/comments')
  @ApiOperation({ summary: 'Get all comments for a task' })
  async findByTask(@Param('taskId') taskId: string) {
    return this.commentsService.findByTask(taskId);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Delete a comment' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role?: string,
  ) {
    return this.commentsService.delete(id, userId, role);
  }
}
