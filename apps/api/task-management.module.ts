import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { TaskModule } from './modules/task/task.module';

import { OrganizationModule } from './modules/organization/orgnaization.module';
import { RoleModule } from './modules/role/role.module';
import { AuthImptModule } from './modules/auth-impt/auth-impt.module';
import { AuthMiddleware } from './middleware/auth.middleware';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { AuditInterceptor } from './modules/audit-log/audit-log.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [
    AuthModule,
    OrganizationModule,
    RoleModule,
    UserModule,
    TaskModule,
    AuthImptModule,
    AuditLogModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
})
export class TaskManagementModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
