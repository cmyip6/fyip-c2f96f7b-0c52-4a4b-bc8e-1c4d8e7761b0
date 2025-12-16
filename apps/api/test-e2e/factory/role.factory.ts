import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from '../../dto/create-role.dto';
import { faker } from '@faker-js/faker';
import { UserRoleOptions } from '@libs/data/type/user-role.enum';
import { UpdateRoleDto } from '@api/dto/update-role.dto';
import { PermissionLevelOptions } from '@libs/data/type/permission-level.enum';
import { EntityTypeOptions } from '@libs/data/type/entity-type.enum';
@Injectable()
export class RoleFactory {
  constructor() {}

  createFakeRoleDto(
    organizationId: number,
    roleOption: UserRoleOptions,
  ): CreateRoleDto {
    return {
      name: roleOption,
      description: faker.string.alphanumeric(20),
      organizationId,
    };
  }

  updateRolePermissionDto(
    organizationId: number,
    permissions: {
      entityType: EntityTypeOptions;
      permission: PermissionLevelOptions;
    }[],
  ): UpdateRoleDto {
    return {
      permissions: {
        insert: permissions,
      },
      organizationId,
    };
  }
}
