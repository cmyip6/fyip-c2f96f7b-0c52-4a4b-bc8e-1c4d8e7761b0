import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { OrganizationEntity } from '@api/models/organizations.entity';
import { UserEntity } from '@api/models/users.entity';
@Module({
  imports: [TypeOrmModule.forFeature([OrganizationEntity, UserEntity])],
  providers: [OrganizationService],
  controllers: [OrganizationController],
  exports: [OrganizationService],
})
export class OrganizationModule {}
