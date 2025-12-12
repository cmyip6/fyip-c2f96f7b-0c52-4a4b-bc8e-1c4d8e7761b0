import {
  RoleGuardHandlerType,
  ROLES_KEY,
} from '@api/decorator/roles.decorator';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AUTHORIZATION_SERVICE } from './policy-guard';
import { AuthImptService } from '@api/modules/auth-impt/auth-impt.service';
import { getEntityValue } from '@api/helper/extract-path-id';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EntityTypeOptions } from '@libs/data/type/entity-type.enum';
import { TaskEntity } from '@api/models/tasks.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  logger = new Logger(RolesGuard.name);
  @Inject(Reflector) private readonly reflector: Reflector;
  @Inject(AUTHORIZATION_SERVICE)
  private readonly authorizationImplService: AuthImptService;
  @InjectDataSource() private readonly dataSource: DataSource;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const handler = this.reflector.getAllAndOverride<RoleGuardHandlerType>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!handler) {
      return true;
    }
    const { user } = request;

    if (!user) {
      this.logger.error(
        'User is not in request. Unable to verify roles, access denied.',
      );
      return false;
    }

    const isSuperUser = await this.authorizationImplService.isSuperUser(
      user.id,
    );

    if (isSuperUser) {
      this.logger.debug('User is a superuser, access granted.');
      return true;
    }

    if (!user.roles.length) return false;

    const { path, roles, entityType } = handler;
    const entityId = getEntityValue(request, path);

    let organizationId = null;
    switch (entityType) {
      case EntityTypeOptions.ORGANIZATION: {
        organizationId = entityId;
        break;
      }
      case EntityTypeOptions.TASK: {
        const taskDb = await this.dataSource
          .getRepository(TaskEntity)
          .findOneBy({ id: entityId });
        if (!taskDb) return false;
        organizationId = taskDb.organizationId;
      }
      default:
        break;
    }

    if (!organizationId) {
      this.logger.error(
        'Invalid entity type passed in role guards: ' + entityType,
      );
      return false;
    }

    return await this.authorizationImplService.isRoleValid(
      user.id,
      organizationId,
      roles,
    );
  }
}
