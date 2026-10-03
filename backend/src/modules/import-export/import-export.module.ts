import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module.js';
import { ImportExportController } from './import-export.controller.js';
import { ImportExportService } from './import-export.service.js';

@Module({
  imports: [NotificationsModule],
  controllers: [ImportExportController],
  providers: [ImportExportService],
  exports: [ImportExportService],
})
export class ImportExportModule {}
