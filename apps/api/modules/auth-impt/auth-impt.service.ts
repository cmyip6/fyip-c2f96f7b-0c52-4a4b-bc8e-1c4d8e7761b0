import { Injectable, Logger } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { UserEntity } from '@api/models/users.entity';
import { TaskEntity } from '@api/models/tasks.entity';
import { PermissionEntity } from '@api/models/permissions.entity';
import { EntityTypeOptions } from '@libs/data/type/entity-type.enum';
import { ThrowLogoutResponse } from '@api/helper/throw-log-out-response';
import { UserRoleOptions } from '@libs/data/type/user-role.enum';
import { PermissionLevelOptions } from '@libs/data/type/permission-level.enum';
import { UserTypeOptions } from '@libs/data/type/user-type.enum';

@Injectable()
export class AuthImptService {
  private readonly logger = new Logger(AuthImptService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async userIsAuthorized(
    userId: string,
    entityType: EntityTypeOptions,
    permission: PermissionLevelOptions,
    entityId: number,
  ): Promise<boolean> {
    const userRepo = this.dataSource.getRepository(UserEntity);
    const taskRepo = this.dataSource.getRepository(TaskEntity);
    const permissionRepo = this.dataSource.getRepository(PermissionEntity);

    this.logger.verbose('Checking permission...');
    this.logger.verbose('Getting user by id' + userId);
    const userDb = await userRepo.findOne({
      where: { id: userId },
      relations: { roles: true },
    });
    if (!userDb) return false;

    if (userDb.userType === UserTypeOptions.SUPER_USER) {
      this.logger.verbose('User is a super user, access granted.');
      return true;
    }

    const userRoles = userDb.roles || [];
    if (!userRoles?.length) {
      this.logger.verbose(
        'User does not belong to any organization, loggin out user.',
      );
      ThrowLogoutResponse(
        'Role must be assigned to access resources, please contact admin for support.',
      );
    }

    switch (entityType) {
      case EntityTypeOptions.TASK: {
        const foundTask = await taskRepo.findOne({ where: { id: entityId } });
        if (!foundTask) {
          this.logger.verbose('Task not found.');
          return false;
        }
        const foundRole = userRoles.find(
          (el) => el.organizationId === foundTask.organizationId,
        );

        if (!foundRole) {
          this.logger.verbose('Role not found.');
          return false;
        }

        return await permissionRepo.existsBy({
          roleId: foundRole.id,
          permission,
        });
      }
      case EntityTypeOptions.ORGANIZATION: {
        const foundRole = userRoles.find(
          (el) => el.organizationId === entityId,
        );

        if (!foundRole) {
          this.logger.verbose('Role not found.');
          return false;
        }

        return await permissionRepo.existsBy({
          roleId: foundRole.id,
          permission,
        });
      }
      default:
        break;
    }

    this.logger.verbose(
      'Incorrect entity type passed into policy guard, return false...',
    );
    return false;
  }

  async isUserValid(userId: string): Promise<boolean> {
    const userRepo = this.dataSource.getRepository(UserEntity);
    const foundUser = await userRepo.findOne({
      where: { id: userId },
      relations: { roles: true },
    });
    return foundUser && !!foundUser.roles?.length;
  }

  async isRoleValid(
    userId: string,
    organizationId: number,
    roles: UserRoleOptions[],
  ): Promise<boolean> {
    const userRepo = this.dataSource.getRepository(UserEntity);
    return await userRepo.existsBy({
      id: userId,
      roles: { name: In(roles), organizationId },
    });
  }
}
