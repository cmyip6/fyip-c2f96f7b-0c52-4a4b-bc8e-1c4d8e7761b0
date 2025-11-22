import { AuthImptService } from '@api/modules/auth-impt/auth-impt.service';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AUTHORIZATION_SERVICE } from './policy-guard';
import { ResponseActionOptions } from '@libs/data/const/response-action.enum';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  logger = new Logger(JwtAuthGuard.name);

  @Inject(AUTHORIZATION_SERVICE)
  private readonly authImplService: AuthImptService;
  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.verbose('Validating user....');
    const request = context.switchToHttp().getRequest();

    // User is handled from the middleware.
    if (request.user) {
      const { user } = request;
      const isValid = await this.authImplService.isUserValid(
        user.id,
        user.role,
      );
      const currentTime = Math.floor(Date.now() / 1000) + 60;
      const tokenExpired = !user?.tokenExpiry || user.tokenExpiry < currentTime;
      if (isValid && !tokenExpired) {
        this.logger.verbose('User is valid, access granted');
        return true;
      }
    }

    throw new UnauthorizedException({
      statusCode: 401,
      message: 'You must be logged in to access this resource',
      action: ResponseActionOptions.LOGOUT,
    });
  }
}
