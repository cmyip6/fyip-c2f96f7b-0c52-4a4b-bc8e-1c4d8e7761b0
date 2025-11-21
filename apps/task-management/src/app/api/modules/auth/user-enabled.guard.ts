import {KeycloakUserInterface} from '@lib/base-library';
import {CanActivate, ExecutionContext, Inject, Injectable, Logger} from '@nestjs/common';
import {Request} from 'express';
import {UserService} from '../user/user.service'; // Asegúrate de tener un servicio que pueda verificar al usuario

@Injectable()
export class UserEnabledAuthGuard implements CanActivate {
    private readonly xlogger = new Logger(UserEnabledAuthGuard.name);

    @Inject()
    private readonly userService: UserService;

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const requestUser = request.user as KeycloakUserInterface;

        if (!requestUser || !requestUser.sub) {
            this.xlogger.verbose('User is not in context.');
            return true;
        }

        this.xlogger.verbose('Get user to verify if it enabled later');
        const user = await this.userService.getUserAndActiveOnly(requestUser.sub);

        if (user !== null && user.isActive === false) {
            this.xlogger.error('User exists and its not active');
            return false;
        }

        return true;
    }
}
