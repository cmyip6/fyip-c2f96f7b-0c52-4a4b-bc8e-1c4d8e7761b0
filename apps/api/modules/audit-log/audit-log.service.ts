import { Injectable, NotFoundException } from '@nestjs/common';
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

  async findAll(userId: string): Promise<AuditLogEntity[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async delete(id: number): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Audit Log with ID ${id} not found`);
    }
  }
}
