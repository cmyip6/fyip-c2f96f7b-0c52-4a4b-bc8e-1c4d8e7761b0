import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { dataSourceConfig } from '../../database/dbconfig';
import * as migrations from '../../database/migrations';
import * as subscribers from '../../models/subscribers';
import { TaskManagementModule } from '../../task-management.module';

import { OrganizationEntity } from '../../models/organizations.entity';
import { TaskEntity } from '../../models/tasks.entity';
import { UserEntity } from '../../models/users.entity';
import { RoleEntity } from '../../models/roles.entity';
import { PermissionEntity } from '../../models/permissions.entity';
import { OrganizationRelationEntity } from '../../models/organization-relation.entity';
import { AuditLogEntity } from '../../models/audit-log.entity';
import { ClsModule } from 'nestjs-cls';
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
            AuditLogEntity,
          ],
        });
      },
      dataSourceFactory: async (options) => {
        if (!options) throw new Error('Invalid options');
        const dataSource = await new DataSource(options).initialize();
        return addTransactionalDataSource(dataSource);
      },
    }),
    TaskManagementModule,
  ],
})
export class AppModule {}
