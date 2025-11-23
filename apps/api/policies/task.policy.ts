import { EntityTypeOptions } from '@libs/data/type/entity-type.enum';
import { PermissionLevelOptions } from '@libs/data/type/permission-level.enum';

export type PolicyHandlerType = {
  entityType: EntityTypeOptions;
  permission: PermissionLevelOptions;
  path: string;
};

export class PoliciesExecuter {
  private entityType: EntityTypeOptions;

  constructor(entitType: EntityTypeOptions) {
    this.entityType = entitType;
  }

  public Read(path: string): PolicyHandlerType {
    return this.can(PermissionLevelOptions.READ, path);
  }

  public Create(path: string): PolicyHandlerType {
    return this.can(PermissionLevelOptions.CREATE, path);
  }

  public Update(path: string): PolicyHandlerType {
    return this.can(PermissionLevelOptions.UPDATE, path);
  }

  public Delete(path: string): PolicyHandlerType {
    return this.can(PermissionLevelOptions.DELETE, path);
  }

  private can(
    permission: PermissionLevelOptions,
    path?: string,
  ): PolicyHandlerType {
    return { entityType: this.entityType, permission, path };
  }
}
