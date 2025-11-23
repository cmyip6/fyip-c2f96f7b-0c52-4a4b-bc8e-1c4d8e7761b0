import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthImptService } from '@api/modules/auth-impt/auth-impt.service';
import {
  CHECK_POLICIES_KEY,
  NO_POLICIES_KEY,
} from '@api/decorator/policy-guard.decorator';
import { PolicyHandlerType } from '@api/policies/task.policy';
import { getEntityValue } from '@api/helper/extract-path-id';

export const AUTHORIZATION_SERVICE = 'AUTHORIZATION_SERVICE';

@Injectable()
export class PoliciesGuard implements CanActivate {
  private logger: Logger = new Logger(PoliciesGuard.name);
  @Inject(AUTHORIZATION_SERVICE)
  private readonly authImptService: AuthImptService;
  @Inject(Reflector) private readonly reflector: Reflector;

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
      this.reflector.get<PolicyHandlerType[]>(
        CHECK_POLICIES_KEY,
        context.getHandler(),
      ) || [];

    const request = context.switchToHttp().getRequest();

    this.logger.verbose('Get request user');
    const requestUser = request.user;

    this.logger.verbose('Checking for each defined path');
    for (const { permission, entityType, path } of policyHandlers) {
      const entityId = getEntityValue(request, path);
      const res = await this.authImptService.userIsAuthorized(
        requestUser.id,
        entityType,
        permission,
        entityId,
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
