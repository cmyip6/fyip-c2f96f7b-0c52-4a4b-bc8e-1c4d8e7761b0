import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const CHECK_POLICIES_KEY = 'check_policy';
export const NO_POLICIES_KEY = 'no_policy';

export type IsUserAuthorizedType = (taskId: number) => Promise<boolean>;

export const CheckPolicies = (...path: string[]): CustomDecorator =>
  SetMetadata(CHECK_POLICIES_KEY, path);
export const NoPolicies = (): CustomDecorator =>
  SetMetadata(NO_POLICIES_KEY, NO_POLICIES_KEY);
