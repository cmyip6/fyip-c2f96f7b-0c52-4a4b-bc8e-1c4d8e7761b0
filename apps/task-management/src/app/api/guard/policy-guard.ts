import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHECK_POLICIES_KEY, NO_POLICIES_KEY } from './policy-guard.decorator';
import { AuthService } from '../modules/auth/auth.service';
import { getEntityValue } from '../helper';

export const ABSTRACT_AUTHORIZATION_SERVICE = 'ABSTRACT_AUTHORIZATION_SERVICE';

@Injectable()
export class PoliciesGuard implements CanActivate {
  private logger: Logger;

  @Inject() private readonly authService: AuthService;

  constructor(protected readonly reflector: Reflector) {
    this.logger = new Logger(this.constructor.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.verbose('Check if no policies is defined');
    const noPolicyHandlers = this.reflector.get<string>(
      NO_POLICIES_KEY,
      context.getHandler(),
    );
    if (noPolicyHandlers === NO_POLICIES_KEY) {
      this.logger.verbose('No policies defined. Open access to the resource');
      return true;
    }

    this.logger.verbose('Get check policies');
    const policyHandlers =
      this.reflector.get<string[]>(CHECK_POLICIES_KEY, context.getHandler()) ||
      [];

    const request = context.switchToHttp().getRequest();

    this.logger.verbose('Get request user');
    const requestUser = request.user;

    this.logger.verbose('Checking for each defined path');
    for (const path of policyHandlers) {
      const taskId = getEntityValue(request, path);
      const res = await this.authService.userIsAuthorized(
        requestUser.id,
        taskId,
      );

      if (res !== true) {
        this.logger.verbose(
          `Normal user doesn't have permission to ${request.url}`,
        );
        return false;
      }
    }
    this.logger.verbose(`Normal user have permission to ${request.url}`);
    return true;
  }
}
