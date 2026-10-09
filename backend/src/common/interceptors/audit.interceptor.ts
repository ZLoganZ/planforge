import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditAction } from '@prisma/client';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service.js';
import {
  AUDIT_METADATA_KEY,
  AuditOptions,
} from '../decorators/audit.decorator.js';

const SKIPPED_ROOT_ROUTES = new Set([
  'auth',
  'import-export',
  'audit-logs',
  'notifications',
  'analytics',
]);

const KNOWN_ENTITY_MAP: Record<string, string> = {
  workspaces: 'Workspace',
  projects: 'Project',
  tasks: 'Task',
  comments: 'Comment',
  sprints: 'Sprint',
  labels: 'Label',
  users: 'User',
  invitations: 'Invitation',
  attachments: 'Attachment',
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.getAllAndOverride<AuditOptions>(
      AUDIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (auditOptions?.skip) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit mutation operations (POST, PATCH, PUT, DELETE)
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = request.user;
    if (!user?.id) {
      return next.handle();
    }

    const url = request.baseUrl || request.url || '';
    const cleanPath = url.replace(/^\/api\/?/, '').split('?')[0];
    const segments = cleanPath.split('/').filter(Boolean);
    const rootSegment = segments[0] || '';

    // Skip root routes that handle their own auditing or shouldn't generate audit entries
    if (SKIPPED_ROOT_ROUTES.has(rootSegment) && !auditOptions?.entityType) {
      return next.handle();
    }

    // Determine audit action
    let action: AuditAction = auditOptions?.action ?? AuditAction.UPDATE;
    if (!auditOptions?.action) {
      if (method === 'POST') action = AuditAction.CREATE;
      else if (method === 'DELETE') action = AuditAction.DELETE;
      else action = AuditAction.UPDATE;
    }

    // Determine entityType
    let entityType = auditOptions?.entityType;
    if (!entityType) {
      if (segments.includes('comments')) {
        entityType = 'Comment';
      } else if (segments.includes('attachments')) {
        entityType = 'Attachment';
      } else if (KNOWN_ENTITY_MAP[rootSegment]) {
        entityType = KNOWN_ENTITY_MAP[rootSegment];
      } else if (rootSegment) {
        const singular = rootSegment.endsWith('s')
          ? rootSegment.slice(0, -1)
          : rootSegment;
        entityType = singular.charAt(0).toUpperCase() + singular.slice(1);
      } else {
        entityType = 'System';
      }
    }

    const ipAddress =
      request.headers['x-forwarded-for']?.toString() ||
      request.socket?.remoteAddress ||
      undefined;
    const userAgent = request.headers['user-agent'] || undefined;

    return next.handle().pipe(
      tap((data) => {
        const entityId =
          data?.id ||
          request.params?.id ||
          request.params?.workspaceId ||
          request.params?.projectId ||
          request.params?.taskId ||
          request.params?.commentId ||
          (data && typeof data === 'object' && 'id' in data
            ? (data as { id?: string }).id
            : undefined);

        // Do not log unidentifiable operations with unknown entity id
        if (!entityId || entityId === 'unknown') {
          return;
        }

        // Strip sensitive credentials if present in body
        const safeDiff = request.body ? { ...request.body } : undefined;
        if (safeDiff) {
          delete safeDiff.password;
          delete safeDiff.passwordHash;
          delete safeDiff.refreshToken;
        }

        void this.auditLogsService
          .create({
            action,
            entityType: entityType || 'System',
            entityId: String(entityId),
            diff: safeDiff,
            actorId: user.id,
            ipAddress,
            userAgent,
          })
          .catch(() => {
            // Non-blocking error handling for audit logging
          });
      }),
    );
  }
}
