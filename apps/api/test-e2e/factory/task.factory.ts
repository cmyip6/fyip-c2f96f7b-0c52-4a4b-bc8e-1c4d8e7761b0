import { Injectable } from '@nestjs/common';
import { CreateTaskDto } from '../../dto/create-task.dto';
import { faker } from '@faker-js/faker';

@Injectable()
export class TaskFactory {
  constructor() {}

  createFakeTaskDto(organizationId: number): CreateTaskDto {
    return {
      title: faker.company.name(),
      description: faker.lorem.sentence(),
      organizationId,
    };
  }
}
