import { Test, TestSuite } from '../modules/jest-test.decorator';
import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { BaseTest } from './base-test';
import { UserSuite } from './user.suite';
import { CreateTaskDto } from '@api/dto/create-task.dto';
import { RoleFactory, TaskFactory } from '../factory';
import { TaskStatusOptions } from '@libs/data/type/task-status.enum';
import { EntityTypeOptions } from '@libs/data/type/entity-type.enum';
import { PermissionLevelOptions } from '@libs/data/type/permission-level.enum';

@Injectable()
@TestSuite('Task Suite')
export class TaskSuite extends BaseTest implements OnModuleInit {
  private readonly logger = new Logger(TaskSuite.name);

  @Inject(TaskFactory) taskFactory: TaskFactory;
  @Inject(RoleFactory) roleFactory: RoleFactory;

  constructor(@Inject(UserSuite) private readonly userSuite: UserSuite) {
    super();
  }

  onModuleInit(): void {
    this.logger.debug('Task Suite initialized');
    this.setUrl('/task');
  }

  @Test('Create Task')
  async createTask(): Promise<void> {
    const { loginDto, organization, role } = await this.userSuite.createUser();
    const cookies = await this.login(loginDto);

    this.logger.debug('Create task should fail without permission');
    const createTaskDto = this.taskFactory.createFakeTaskDto(organization.id);
    await this.post(``, createTaskDto, cookies).expect(HttpStatus.FORBIDDEN);

    this.logger.debug('Assigning permission to role');
    const updateRoleDto = this.roleFactory.updateRolePermissionDto(
      organization.id,
      [
        {
          entityType: EntityTypeOptions.ORGANIZATION,
          permission: PermissionLevelOptions.CREATE,
        },
        {
          entityType: EntityTypeOptions.ORGANIZATION,
          permission: PermissionLevelOptions.READ,
        },
        {
          entityType: EntityTypeOptions.ORGANIZATION,
          permission: PermissionLevelOptions.UPDATE,
        },
        {
          entityType: EntityTypeOptions.ORGANIZATION,
          permission: PermissionLevelOptions.DELETE,
        },
      ],
    );
    const { body: updateResponse } = await this.patch(
      `/role/${role.id}/permission`,
      updateRoleDto,
      cookies,
    ).expect(HttpStatus.OK);
    expect(updateResponse).toBeDefined();

    this.logger.debug('Create task should succeed');
    const { body: createTaskReponse } = await this.post(
      ``,
      createTaskDto,
      cookies,
    ).expect(HttpStatus.CREATED);
    expect(createTaskReponse.id).toBeDefined();
    expect(createTaskReponse.title).toBe(createTaskDto.title);
    expect(createTaskReponse.description).toBe(createTaskDto.description);
    expect(createTaskReponse.status).toBe(TaskStatusOptions.OPEN);
  }
}
