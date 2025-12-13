import { Injectable } from '@nestjs/common';
import { CreateUserDto } from '../../dto/create-user.dto';
import { faker } from '@faker-js/faker';

@Injectable()
export class UserFactory {
  createFakeUserDto(roleId: number): CreateUserDto {
    return {
      username: faker.internet.userName(),
      password: faker.string.alphanumeric(10) + '1aA!@',
      email: faker.internet.email(),
      name: faker.person.firstName() + ' ' + faker.person.lastName(),
      roleId,
    };
  }
}
