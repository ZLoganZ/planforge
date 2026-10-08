import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { ImportExportService } from './import-export.service.js';

@Processor('import-export')
export class ImportExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportExportProcessor.name);

  constructor(private readonly importExportService: ImportExportService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    if (job.name === 'import-tasks') {
      const { jobId, userId, projectId, records } = job.data;
      try {
        await this.importExportService.processTasksImport(
          jobId,
          userId,
          projectId,
          records,
        );
      } catch (err: any) {
        this.logger.error(
          `Error processing import job ${jobId}: ${err.message}`,
          err.stack,
        );
        throw err;
      }
    }
  }
}
