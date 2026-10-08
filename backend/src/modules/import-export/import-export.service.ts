import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  JobStatus,
  NotificationType,
  Prisma,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';
import { Queue } from 'bullmq';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

import { PrismaService } from '../../database/prisma.service.js';
import { NotificationsGateway } from '../notifications/notifications.gateway.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { ExportQueryDto } from './dto/import-export.dto.js';

@Injectable()
export class ImportExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly gateway: NotificationsGateway,
    @InjectQueue('import-export') private importQueue: Queue,
  ) {}

  previewCsv(buffer: Buffer) {
    try {
      const records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, string>[];

      if (records.length === 0) {
        throw new BadRequestException('CSV file is empty');
      }

      const headers = Object.keys(records[0]);
      const sample = records.slice(0, 5);

      return {
        headers,
        totalRows: records.length,
        sample,
      };
    } catch (err: any) {
      throw new BadRequestException(
        `Failed to parse CSV: ${err.message || 'Invalid format'}`,
      );
    }
  }

  async startTaskImport(
    userId: string,
    projectId: string,
    file: Express.Multer.File,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    let records: Record<string, string>[];
    try {
      records = parse(file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (err: any) {
      throw new BadRequestException(`Failed to parse CSV: ${err.message}`);
    }

    const job = await this.prisma.importJob.create({
      data: {
        fileName: file.originalname,
        entityType: 'tasks',
        status: JobStatus.PROCESSING,
        totalRows: records.length,
        processedRows: 0,
        successRows: 0,
        errorRows: 0,
        createdById: userId,
      },
    });

    // Run processing asynchronously in background using BullMQ
    await this.importQueue.add('import-tasks', {
      jobId: job.id,
      userId,
      projectId,
      records,
    });

    return job;
  }

  async processTasksImport(
    jobId: string,
    userId: string,
    projectId: string,
    records: Record<string, string>[],
  ) {
    const errors: { row: number; error: string }[] = [];
    let successCount = 0;
    let processedCount = 0;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { key: true, _count: { select: { tasks: true } } },
    });

    let currentTaskCount = project?._count.tasks ?? 0;

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      processedCount++;

      try {
        const title =
          row['Title'] || row['title'] || row['Name'] || row['name'];
        if (!title) {
          throw new Error('Missing Title');
        }

        const description =
          row['Description'] || row['description'] || undefined;

        // Parse status
        let status: TaskStatus = TaskStatus.TODO;
        const rawStatus = (row['Status'] || row['status'] || '')
          .toUpperCase()
          .replace(/\s+/g, '_');
        if (rawStatus in TaskStatus) {
          status = rawStatus as TaskStatus;
        }

        // Parse priority
        let priority: TaskPriority = TaskPriority.MEDIUM;
        const rawPriority = (
          row['Priority'] ||
          row['priority'] ||
          ''
        ).toUpperCase();
        if (rawPriority in TaskPriority) {
          priority = rawPriority as TaskPriority;
        }

        // Parse story points
        const rawPoints =
          row['Story Points'] || row['storyPoints'] || row['points'];
        const storyPoints = rawPoints ? parseInt(rawPoints, 10) : undefined;

        // Parse due date
        const rawDueDate = row['Due Date'] || row['dueDate'] || row['due_date'];
        let dueDate: Date | undefined;
        if (rawDueDate && !isNaN(Date.parse(rawDueDate))) {
          dueDate = new Date(rawDueDate);
        }

        currentTaskCount++;

        await this.prisma.task.create({
          data: {
            title,
            description,
            status,
            priority,
            storyPoints: isNaN(storyPoints as number) ? undefined : storyPoints,
            dueDate,
            taskNumber: currentTaskCount,
            projectId,
            reporterId: userId,
          },
        });

        successCount++;
      } catch (err: any) {
        errors.push({
          row: i + 1,
          error: err.message || 'Unknown error',
        });
      }

      // Update progress in DB every 10 rows or at completion
      if (processedCount % 10 === 0 || processedCount === records.length) {
        await this.prisma.importJob.update({
          where: { id: jobId },
          data: {
            processedRows: processedCount,
            successRows: successCount,
            errorRows: errors.length,
          },
        });
      }
    }

    const finalStatus =
      errors.length === records.length ? JobStatus.FAILED : JobStatus.COMPLETED;

    const completedJob = await this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        processedRows: processedCount,
        successRows: successCount,
        errorRows: errors.length,
        errorLog:
          errors.length > 0
            ? (errors as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
      },
    });

    // Notify user of completion
    await this.notifications.create({
      userId,
      type: NotificationType.IMPORT_COMPLETED,
      title: `CSV Import ${finalStatus === JobStatus.COMPLETED ? 'Completed' : 'Failed'}`,
      message: `Successfully imported ${successCount} tasks (${errors.length} errors) into project.`,
      data: { jobId, successCount, errorCount: errors.length },
    });

    // Auto audit log
    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.IMPORT,
        entityType: 'Task',
        entityId: projectId,
        actorId: userId,
        diff: {
          importedCount: successCount,
          errorCount: errors.length,
          fileName: completedJob.fileName,
        },
      },
    });
  }

  async getJob(id: string) {
    const job = await this.prisma.importJob.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException(`Import job ${id} not found`);
    }

    return job;
  }

  async listJobs(userId: string) {
    return this.prisma.importJob.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async exportTasks(query: ExportQueryDto) {
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status as TaskStatus } : {}),
      ...(query.priority ? { priority: query.priority as TaskPriority } : {}),
    };

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        project: { select: { key: true, name: true } },
        assignee: { select: { firstName: true, lastName: true, email: true } },
        sprint: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = tasks.map((t) => ({
      Key: `${t.project.key}-${t.taskNumber}`,
      Title: t.title,
      Description: t.description,
      Status: t.status,
      Priority: t.priority,
      Project: t.project.name,
      Assignee: t.assignee
        ? `${t.assignee.firstName} ${t.assignee.lastName}`
        : 'Unassigned',
      Sprint: t.sprint?.name || 'Backlog',
      'Story Points': t.storyPoints ?? '',
      'Due Date': t.dueDate ? t.dueDate.toISOString().split('T')[0] : '',
      'Created At': t.createdAt.toISOString(),
    }));

    return stringify(rows, { header: true });
  }
}
