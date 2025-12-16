import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLogEntity } from '../../models/audit-log.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repo: Repository<AuditLogEntity>,
  ) {}

  async log(params: {
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, any>;
  }): Promise<AuditLogEntity> {
    return await this.repo.save(params);
  }
}
