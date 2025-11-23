import { ResponseActionOptions } from '@libs/data/const/response-action.enum';
import { UnauthorizedException } from '@nestjs/common';

export function ThrowLogoutResponse(message?: string) {
  throw new UnauthorizedException({
    statusCode: 401,
    message: message
      ? message
      : 'You must be logged in to access this resource',
    action: ResponseActionOptions.LOGOUT,
  });
}
