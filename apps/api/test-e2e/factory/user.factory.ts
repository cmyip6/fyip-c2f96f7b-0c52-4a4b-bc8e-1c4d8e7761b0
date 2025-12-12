import { Injectable } from '@nestjs/common';
import { CreateUserDto } from '../../dto/create-user.dto';
import { faker } from '@faker-js/faker';

@Injectable()
export class UserFactory {
  createFakeUserDto(roleId: number, organizationId: number): CreateUserDto {
    return {
      username: faker.internet.userName(),
      password: faker.internet.password(),
      email: faker.internet.email(),
      name: faker.person.firstName() + ' ' + faker.person.lastName(),
      roleId,
      organizationId,
    };
  }
}
