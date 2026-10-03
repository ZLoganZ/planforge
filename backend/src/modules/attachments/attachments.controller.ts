import {
  Controller,
  Delete,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/index.js';
import { AttachmentsService } from './attachments.service.js';

@ApiTags('Attachments')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file attachment to a task' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  uploadAttachment(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })], // 10MB
      }),
    )
    file: Express.Multer.File,
    @Query('taskId') taskId: string,
  ) {
    return this.attachmentsService.uploadAttachment(taskId, file);
  }

  @Get()
  @ApiOperation({ summary: 'List attachments for a task' })
  findByTask(@Query('taskId') taskId: string) {
    return this.attachmentsService.findByTask(taskId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get a signed download URL' })
  getSignedUrl(@Param('id') id: string) {
    return this.attachmentsService.getSignedUrl(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an attachment' })
  remove(@Param('id') id: string) {
    return this.attachmentsService.remove(id);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload user avatar' })
  uploadAvatar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })], // 5MB
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: { id: string },
  ) {
    return this.attachmentsService.uploadAvatar(user.id, file);
  }

  @Delete('avatar')
  @ApiOperation({ summary: 'Remove user avatar' })
  removeAvatar(@CurrentUser() user: { id: string }) {
    return this.attachmentsService.removeAvatar(user.id);
  }
}
