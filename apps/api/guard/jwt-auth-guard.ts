import { AuthImptService } from '@api/modules/auth-impt/auth-impt.service';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AUTHORIZATION_SERVICE } from './policy-guard';
import {
  ThrowLogoutResponse,
  ThrowSilentResponse,
} from '@api/helper/throw-log-out-response';
import { Request, Response } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  logger = new Logger(JwtAuthGuard.name);

  @Inject(AUTHORIZATION_SERVICE)
  private readonly authImplService: AuthImptService;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request: Request = http.getRequest();
    const response: Response = http.getResponse();
    let shouldThrowError = false;

    // User is handled from the middleware.
    if (request.user && request.token) {
      this.logger.verbose('User existed from request, validating user...');
      const { user, token } = request;
      const isValid = await this.authImplService.isUserValid(user.id, token);
      const currentTime = Math.floor(Date.now() / 1000) + 10;
      const tokenExpired = !user?.tokenExpiry || user.tokenExpiry < currentTime;

      if (isValid && !tokenExpired) {
        this.logger.verbose('User is valid, access granted');
        return true;
      }
      shouldThrowError = true;
    }

    response.clearCookie('token', {
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    if (shouldThrowError) {
      ThrowLogoutResponse('Session expired, please login again.');
    } else {
      ThrowSilentResponse();
    }
  }
}
