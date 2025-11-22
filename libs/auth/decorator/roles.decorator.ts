import { UserRoleOptions } from '@libs/data/type/user-role.enum';
import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
interface ConfigInterface {
  [UserRoleOptions.ADMIN]?: boolean;
  [UserRoleOptions.OWNER]?: boolean;
  [UserRoleOptions.VIEWER]?: boolean;
}

const defaultConfig: ConfigInterface = {
  [UserRoleOptions.ADMIN]: true,
  [UserRoleOptions.OWNER]: true,
  [UserRoleOptions.VIEWER]: true,
};

const getRolesList = (config?: ConfigInterface): UserRoleOptions[] => {
  const finalConfig = { ...defaultConfig, ...config };
  return Object.values(UserRoleOptions).filter(
    (type) => finalConfig[type] === true,
  );
};

// assuming role hierarchy Owner > Admin > Viewer

export const Viewer = (): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, getRolesList());
export const Admin = (): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, getRolesList({ [UserRoleOptions.VIEWER]: false }));
export const Owner = (): CustomDecorator<string> =>
  SetMetadata(
    ROLES_KEY,
    getRolesList({
      [UserRoleOptions.ADMIN]: false,
      [UserRoleOptions.VIEWER]: false,
    }),
  );
