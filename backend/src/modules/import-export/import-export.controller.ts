import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
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

import { Audit, CurrentUser } from '../../common/decorators/index.js';
import { ExportQueryDto, StartImportDto } from './dto/import-export.dto.js';
import { ImportExportService } from './import-export.service.js';

@ApiTags('import-export')
@ApiBearerAuth()
@Audit({ skip: true })
@Controller('import-export')
export class ImportExportController {
  constructor(private readonly importExportService: ImportExportService) {}

  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Preview CSV headers and sample rows' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async preview(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.importExportService.previewCsv(file.buffer);
  }

  @Post('tasks')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import tasks from CSV file' })
  async importTasks(
    @CurrentUser('id') userId: string,
    @Body() dto: StartImportDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.importExportService.startTaskImport(
      userId,
      dto.projectId,
      file,
    );
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List recent import jobs' })
  async listJobs(@CurrentUser('id') userId: string) {
    return this.importExportService.listJobs(userId);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get import job status' })
  async getJob(@Param('id') id: string) {
    return this.importExportService.getJob(id);
  }

  @Get('tasks/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="tasks-export.csv"')
  @ApiOperation({ summary: 'Export tasks as CSV' })
  async exportTasks(@Query() query: ExportQueryDto) {
    return this.importExportService.exportTasks(query);
  }
}
