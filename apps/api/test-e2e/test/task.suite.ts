import { Test, TestSuite } from '../modules/jest-test.decorator';
import { Logger, OnModuleInit } from '@nestjs/common';
import { BaseTest } from './base-test';

@TestSuite('Task Suite')
export class TaskE2eSpec extends BaseTest implements OnModuleInit {
  private readonly logger = new Logger(TaskE2eSpec.name);

  onModuleInit(): void {
    this.logger.debug('TaskE2eSpec initialized');
    this.setUrl('/tasks');
  }

  @Test('Create Task')
  async createTask(): Promise<void> {
    console.log('Testing in progress');
    this.logger.debug('generate user token');
  }
}
