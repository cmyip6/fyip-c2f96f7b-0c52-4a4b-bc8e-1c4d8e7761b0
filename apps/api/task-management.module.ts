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
import * as Validators from './validator';
import { ClsModule } from 'nestjs-cls';

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
      },
    }),
    AuthModule,
    OrganizationModule,
    RoleModule,
    UserModule,
    TaskModule,
    AuthImptModule,
    AuditLogModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    ...Object.values(Validators),
  ],
})
export class TaskManagementModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
