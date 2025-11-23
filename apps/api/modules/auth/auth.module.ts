import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserEntity } from '@api/models/users.entity';
import { OrganizationEntity } from '@api/models/organizations.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, OrganizationEntity])],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
