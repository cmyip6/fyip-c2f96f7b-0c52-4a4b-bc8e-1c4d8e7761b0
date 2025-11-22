import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { UserEntity } from '@api/models/users.entity';
import { TaskEntity } from '@api/models/tasks.entity';
import { PermissionEntity } from '@api/models/permissions.entity';

@Injectable()
export class AuthImptService {
  private readonly logger = new Logger(AuthImptService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async userIsAuthorized(
    userId: string,
    taskId: number | null,
  ): Promise<boolean> {
    const userRepo = this.dataSource.getRepository(UserEntity);
    const taskRepo = this.dataSource.getRepository(TaskEntity);
    const permissionRepo = this.dataSource.getRepository(PermissionEntity);

    this.logger.verbose('Checking permission...');
    this.logger.verbose('Getting user by id' + userId);
    const userDb = await userRepo.findOneBy({ id: userId });
    if (!userDb) return false;

    this.logger.verbose('Getting task' + taskId);
    const taskDb = await taskRepo.findOneBy({ id: taskId });
    if (!taskDb) return false;
    const isTaskOwner = taskDb.userId === userId;

    if (isTaskOwner) {
      this.logger.verbose('User is owner of the task, access granted');
      return true;
    }

    return await permissionRepo.existsBy({
      taskId,
      roleId: userDb.roleId,
    });
  }

  async isUserValid(userId: string, roleName: string): Promise<boolean> {
    const userRepo = this.dataSource.getRepository(UserEntity);
    return await userRepo.existsBy({ id: userId, role: { name: roleName } });
  }
}
