import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { tap } from 'rxjs/operators';
import { AuditLogService } from './audit-log.service';
import {
  AUDIT_METADATA_KEY,
  AuditMetadata,
} from '../../decorator/audit-log.decorator';
import { getEntityValue } from '../../helper/extract-path-id';
import { Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private logger = new Logger(AuditInterceptor.name);
  @Inject(Reflector) private readonly reflector: Reflector;
  @Inject(AuditLogService) private readonly auditLogService: AuditLogService;

  intercept(context: ExecutionContext, next: CallHandler) {
    const auditMeta = this.reflector.get<AuditMetadata>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    if (!auditMeta) {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();
    const user = request.user;
    this.logger.log(
      `${user.id} is making a ${request.method} request to ${request.url}`,
    );

    return next.handle().pipe(
      tap(async (result) => {
        const resolvedResult =
          result instanceof Promise ? await result : result;
        const resourceId = auditMeta.entityIdPath
          ? getEntityValue(request, auditMeta.entityIdPath)
          : undefined;

        this.logger.log(
          `Request to ${request.url} completed with status ${response.statusCode}, result: ${JSON.stringify(
            resolvedResult,
          )}`,
        );

        await this.auditLogService.log({
          userId: user.id,
          action: auditMeta.action,
          entityType: auditMeta.entityType,
          entityId: resourceId ? String(resourceId) : null,
          metadata: {
            method: request.method,
            path: request.url,
            status: response.statusCode,
          },
        });
      }),
    );
  }
}
