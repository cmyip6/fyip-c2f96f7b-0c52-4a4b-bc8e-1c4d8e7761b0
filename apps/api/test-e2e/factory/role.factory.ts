import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from '../../dto/create-role.dto';
import { faker } from '@faker-js/faker';
import { UserRoleOptions } from '@libs/data/type/user-role.enum';
import { PropertyLength } from '@libs/data/const/length.const';
@Injectable()
export class RoleFactory {
  constructor() {}

  createFakeRoleDto(
    organizationId: number,
    roleOption: UserRoleOptions,
  ): CreateRoleDto {
    return {
      name: roleOption,
      description: faker.lorem.sentence({
        min: 10,
        max: PropertyLength.DESCRIPTION,
      }),
      organizationId,
    };
  }
}
