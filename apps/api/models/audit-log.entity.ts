import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('AUDIT_LOG')
export class AuditLogEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'USER_ID', type: 'varchar' })
  userId: string;

  @Column({ name: 'ACTION', type: 'varchar' })
  action: string;

  @Column({ name: 'ENTITY_TYPE', type: 'varchar' })
  entityType: string;

  @Column({ name: 'ENTITY_ID', type: 'varchar', nullable: true })
  entityId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
