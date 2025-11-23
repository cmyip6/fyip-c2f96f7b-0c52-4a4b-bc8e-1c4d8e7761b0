import { AuthUserInterface } from '@libs/data/type/auth-user.interface';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (
    data: keyof AuthUserInterface | undefined,
    ctx: ExecutionContext,
  ): AuthUserInterface | AuthUserInterface[keyof AuthUserInterface] => {
    const user = ctx.switchToHttp().getRequest().user;

    return data ? user[data] : user;
  },
);
