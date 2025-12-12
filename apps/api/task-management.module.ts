import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { TaskModule } from './modules/task/task.module';

import { OrganizationModule } from './modules/organization/orgnaization.module';
import { RoleModule } from './modules/role/role.module';
import { AuthImptModule } from './modules/auth-impt/auth-impt.module';
import { AuthMiddleware } from './middleware/auth.middleware';
@Module({
  imports: [
    AuthModule,
    OrganizationModule,
    RoleModule,
    UserModule,
    TaskModule,
    AuthImptModule,
  ],
})
export class TaskManagementModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
