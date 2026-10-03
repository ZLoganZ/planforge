import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { HttpLoggerMiddleware } from './common/middleware/http-logger.middleware.js';
import { PrismaModule } from './database/prisma.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { AttachmentsModule } from './modules/attachments/attachments.module.js';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CommentsModule } from './modules/comments/comments.module.js';
import { EmailModule } from './modules/email/email.module.js';
import { ImportExportModule } from './modules/import-export/import-export.module.js';
import { InvitationsModule } from './modules/invitations/invitations.module.js';
import { LabelsModule } from './modules/labels/labels.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { SprintsModule } from './modules/sprints/sprints.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { TasksModule } from './modules/tasks/tasks.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { WorkspacesModule } from './modules/workspaces/workspaces.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    EmailModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    InvitationsModule,
    ProjectsModule,
    LabelsModule,
    TasksModule,
    SprintsModule,
    AuditLogsModule,
    NotificationsModule,
    AnalyticsModule,
    StorageModule,
    AttachmentsModule,
    CommentsModule,
    ImportExportModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global guards — applied to all routes unless @Public() is used
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}
