import { Module } from '@nestjs/common';
import { AuditInterceptor } from './audit-log.interceptor';
import { AuditLogService } from './audit-log.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from '../../models/audit-log.entity';
import { BaseEntitySubscriber } from '../../models/subscribers';
import { AuditLogController } from './audit-log.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  controllers: [AuditLogController],
  providers: [AuditLogService, AuditInterceptor, BaseEntitySubscriber],
  exports: [AuditLogService],
})
export class AuditLogModule {}
