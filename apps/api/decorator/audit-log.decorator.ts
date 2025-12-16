import { SetMetadata } from '@nestjs/common';

export const AUDIT_METADATA_KEY = 'AUDIT_METADATA_KEY';

export interface AuditMetadata {
  action: string;
  entityType: string;
  entityIdPath?: string;
}

export const Audit = (meta: AuditMetadata) =>
  SetMetadata(AUDIT_METADATA_KEY, meta);
