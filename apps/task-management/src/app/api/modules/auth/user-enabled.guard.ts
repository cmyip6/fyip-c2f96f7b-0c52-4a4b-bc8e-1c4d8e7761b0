import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { UserService } from '../user/user.service'; // Asegúrate de tener un servicio que pueda verificar al usuario

@Injectable()
export class UserEnabledAuthGuard implements CanActivate {
  private readonly xlogger = new Logger(UserEnabledAuthGuard.name);

  @Inject()
  private readonly userService: UserService;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestUser = request.user;

    if (!requestUser || !requestUser.id) {
      this.xlogger.verbose('User is not in context.');
      return true;
    }

    this.xlogger.verbose('Get user to verify if it enabled later');
    const user = await this.userService.getUserById(requestUser.id);

    if (user !== null && !user.token) {
      this.xlogger.error('User exists and its not active');
      return false;
    }

    return true;
  }
}
