import { EntityTypeOptions } from '@libs/data/type/entity-type.enum';
import { PermissionLevelOptions } from '@libs/data/type/permission-level.enum';

export type PolicyHandlerType = {
  entityType: EntityTypeOptions;
  permission: PermissionLevelOptions;
  path: string;
  optional: boolean;
};

export type PolicyHandlerOptions = {
  optional?: boolean;
};

export class PoliciesExecutor {
  private entityType: EntityTypeOptions;

  constructor(entitType?: EntityTypeOptions) {
    this.entityType = entitType;
  }

  public Read(
    path: string,
    { optional = false }: PolicyHandlerOptions = {},
  ): PolicyHandlerType {
    return this.can(PermissionLevelOptions.READ, path, optional);
  }

  public Create(
    path: string,
    { optional = false }: PolicyHandlerOptions = {},
  ): PolicyHandlerType {
    return this.can(PermissionLevelOptions.CREATE, path, optional);
  }

  public Update(
    path: string,
    { optional = false }: PolicyHandlerOptions = {},
  ): PolicyHandlerType {
    return this.can(PermissionLevelOptions.UPDATE, path, optional);
  }

  public Delete(
    path: string,
    { optional = false }: PolicyHandlerOptions = {},
  ): PolicyHandlerType {
    return this.can(PermissionLevelOptions.DELETE, path, optional);
  }

  public SuperUser(): PolicyHandlerType {
    return this.can(PermissionLevelOptions.SUPER_USER);
  }

  private can(
    permission: PermissionLevelOptions,
    path?: string,
    optional?: boolean,
  ): PolicyHandlerType {
    return { entityType: this.entityType, permission, path, optional };
  }
}
