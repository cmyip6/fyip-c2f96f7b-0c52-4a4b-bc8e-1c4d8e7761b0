import { AuthImptService } from '@api/modules/auth-impt/auth-impt.service';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AUTHORIZATION_SERVICE } from './policy-guard';
import { ThrowLogoutResponse } from '@api/helper/throw-log-out-response';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  logger = new Logger(JwtAuthGuard.name);

  @Inject(AUTHORIZATION_SERVICE)
  private readonly authImplService: AuthImptService;
  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.verbose('Validating user....');
    const request: Request = context.switchToHttp().getRequest();

    // User is handled from the middleware.
    if (request.user) {
      const { user } = request;
      const isValid = await this.authImplService.isUserValid(user.id);
      const currentTime = Math.floor(Date.now() / 1000) + 60;
      const tokenExpired = !user?.tokenExpiry || user.tokenExpiry < currentTime;
      if (isValid && !tokenExpired) {
        this.logger.verbose('User is valid, access granted');
        return true;
      }
    }

    ThrowLogoutResponse();
  }
}
