import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module.js';
import { ImportExportController } from './import-export.controller.js';
import { ImportExportProcessor } from './import-export.processor.js';
import { ImportExportService } from './import-export.service.js';

@Module({
  imports: [
    NotificationsModule,
    BullModule.registerQueue({
      name: 'import-export',
    }),
  ],
  controllers: [ImportExportController],
  providers: [ImportExportService, ImportExportProcessor],
  exports: [ImportExportService],
})
export class ImportExportModule {}
