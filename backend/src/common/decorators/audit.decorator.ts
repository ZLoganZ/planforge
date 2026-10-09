import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '@prisma/client';

export const AUDIT_METADATA_KEY = 'audit_metadata';

export interface AuditOptions {
  entityType?: string;
  action?: AuditAction;
  skip?: boolean;
}

export const Audit = (options?: AuditOptions) =>
  SetMetadata(AUDIT_METADATA_KEY, options || {});
