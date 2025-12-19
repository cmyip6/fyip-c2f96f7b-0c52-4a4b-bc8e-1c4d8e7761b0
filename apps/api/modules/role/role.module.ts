import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { RoleEntity } from '@api/models/roles.entity';
import { PermissionEntity } from '@api/models/permissions.entity';
import { BaseEntitySubscriber } from '../../models/subscribers';

@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity, PermissionEntity])],
  controllers: [RoleController],
  providers: [RoleService, BaseEntitySubscriber],
  exports: [RoleService],
})
export class RoleModule {}
