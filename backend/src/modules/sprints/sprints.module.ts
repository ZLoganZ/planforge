import { Module } from '@nestjs/common';
import { SprintsService } from './sprints.service.js';
import { SprintsController } from './sprints.controller.js';

@Module({
  controllers: [SprintsController],
  providers: [SprintsService],
  exports: [SprintsService],
})
export class SprintsModule {}
