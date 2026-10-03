import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async uploadAttachment(taskId: string, file: Express.Multer.File) {
    // Verify task exists
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    // Upload to S3/MinIO
    const { url } = await this.storage.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      `tasks/${taskId}`,
    );

    // Create DB record
    const attachment = await this.prisma.attachment.create({
      data: {
        fileName: file.originalname,
        fileUrl: url,
        fileSize: file.size,
        mimeType: file.mimetype,
        taskId,
      },
    });

    this.logger.log(
      `Attachment uploaded: ${attachment.id} (${file.originalname}) for task ${taskId}`,
    );

    return attachment;
  }

  async findByTask(taskId: string) {
    return this.prisma.attachment.findMany({
      where: { taskId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async getSignedUrl(id: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    // Extract key from URL: http://localhost:9000/planforge-uploads/tasks/xxx/file.pdf
    const urlParts = new URL(attachment.fileUrl);
    // Remove leading slash and bucket name
    const fullPath = urlParts.pathname; // /planforge-uploads/tasks/xxx/file.pdf
    const key = fullPath.split('/').slice(2).join('/'); // tasks/xxx/file.pdf

    const signedUrl = await this.storage.getSignedUrl(key, attachment.fileName);
    return { url: signedUrl, fileName: attachment.fileName };
  }

  async remove(id: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    // Extract key from URL
    try {
      const urlParts = new URL(attachment.fileUrl);
      const key = urlParts.pathname.split('/').slice(2).join('/');
      await this.storage.delete(key);
    } catch (err) {
      this.logger.warn(`Failed to delete from S3: ${err}`);
    }

    await this.prisma.attachment.delete({ where: { id } });

    this.logger.log(`Attachment deleted: ${id}`);
    return { deleted: true };
  }

  // ─── Avatar Upload ──────────────────────────────────────────
  async uploadAvatar(userId: string, file: Express.Multer.File) {
    // 1. Check existing avatar
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    // 2. Upload new avatar
    const { url } = await this.storage.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      `avatars/${userId}`,
    );

    // 3. Update database record
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: url },
    });

    // 4. Delete old avatar from S3 if present
    if (currentUser?.avatarUrl) {
      try {
        const urlParts = new URL(currentUser.avatarUrl);
        const key = urlParts.pathname.split('/').slice(2).join('/');
        if (key && key.startsWith(`avatars/${userId}`)) {
          await this.storage.delete(key);
          this.logger.log(`Deleted previous avatar for user ${userId}: ${key}`);
        }
      } catch (err) {
        this.logger.warn(`Could not delete previous avatar from S3: ${err}`);
      }
    }

    this.logger.log(`Avatar uploaded for user ${userId}`);
    return { avatarUrl: url };
  }

  async removeAvatar(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (user?.avatarUrl) {
      try {
        const urlParts = new URL(user.avatarUrl);
        const key = urlParts.pathname.split('/').slice(2).join('/');
        if (key && key.startsWith(`avatars/${userId}`)) {
          await this.storage.delete(key);
          this.logger.log(`Deleted avatar for user ${userId}: ${key}`);
        }
      } catch (err) {
        this.logger.warn(`Could not delete avatar from S3: ${err}`);
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: null },
      });
    }

    return { avatarUrl: null };
  }
}
