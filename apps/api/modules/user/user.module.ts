import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { OrganizationModule } from '../organization/orgnaization.module';
import { OrganizationService } from '../organization/organization.service';
import { RoleModule } from '../role/role.module';
import { RoleService } from '../role/role.service';
import { OrganizationEntity } from '@api/models/organizations.entity';
import { RoleEntity } from '@api/models/roles.entity';
import { UserEntity } from '@api/models/users.entity';
import { OrganizationRelationEntity } from '@api/models/organization-relation.entity';
import { PermissionEntity } from '@api/models/permissions.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      RoleEntity,
      OrganizationEntity,
      OrganizationRelationEntity,
      PermissionEntity,
    ]),
    OrganizationModule,
    RoleModule,
  ],
  providers: [UserService, RoleService, OrganizationService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
