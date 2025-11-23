import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { TaskModule } from './modules/task/task.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { dataSourceConfig } from './database/dbconfig';
import * as migrations from './database/migrations';

import { OrganizationModule } from './modules/organization/orgnaization.module';
import { RoleModule } from './modules/role/role.module';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { AuthImptModule } from './modules/auth-impt/auth-impt.module';
import { AuthMiddleware } from './middleware/auth.middleware';
import { OrganizationEntity } from './models/organizations.entity';
import { TaskEntity } from './models/tasks.entity';
import { UserEntity } from './models/users.entity';
import { RoleEntity } from './models/roles.entity';
import { PermissionEntity } from './models/permissions.entity';
import { OrganizationRelationEntity } from './models/organization-relation.entity';
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        return dataSourceConfig({
          migrations: Object.values(migrations),
          entities: [
            OrganizationEntity,
            TaskEntity,
            UserEntity,
            RoleEntity,
            PermissionEntity,
            OrganizationRelationEntity,
          ],
        });
      },
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('Invalid options passed');
        }
        let dataSource = new DataSource(options);
        await dataSource.initialize();
        dataSource = addTransactionalDataSource(dataSource);
        return dataSource;
      },
    }),
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
