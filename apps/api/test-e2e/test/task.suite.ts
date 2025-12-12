import { Test, TestSuite } from '../modules/jest-test.decorator';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BaseTest } from './base-test';
import { UserSuite } from './user.suite';

@Injectable()
@TestSuite('Task Suite')
export class TaskSuite extends BaseTest implements OnModuleInit {
  private readonly logger = new Logger(TaskSuite.name);

  constructor(@Inject(UserSuite) private readonly userSuite: UserSuite) {
    super();
  }

  onModuleInit(): void {
    this.logger.debug('Task Suite initialized');
    this.setUrl('/tasks');
  }

  @Test('Create Task')
  async createTask(): Promise<void> {
    // const user = await this.userSuite.createUser();

    this.logger.debug('generate user token');
  }
}
