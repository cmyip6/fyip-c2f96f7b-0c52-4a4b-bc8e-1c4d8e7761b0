import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // User is handled from the middleware.
    if (request.user) {
      return true;
    }

    throw new UnauthorizedException(
      'You must be logged in to access this resource',
    );
  }
}
