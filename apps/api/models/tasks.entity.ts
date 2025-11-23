import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { UserEntity } from './users.entity';
import { PropertyLength } from '@libs/data/const/length.const';
import { TaskStatusOptions } from '@libs/data/type/task-status.enum';
import { OrganizationEntity } from './organizations.entity';

@Entity('TASKS')
export class TaskEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'TITLE', type: 'varchar', length: PropertyLength.TITLE })
  title: string;

  @Column({ name: 'DESCRIPTION', type: 'json', nullable: true })
  description: string;

  @Column({
    name: 'STATUS',
    type: 'varchar',
    nullable: false,
    default: TaskStatusOptions.OPEN,
  })
  status: string;

  @Column({ name: 'DELETED_AT', type: 'timestamp', nullable: true })
  deletedAt: Date;

  @Column({ name: 'DELETED_BY', type: 'varchar', nullable: true })
  deletedBy: string;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({
    name: 'USER_ID',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'TASK_USER_CONSTRAINT',
  })
  user: UserEntity;
  @Column({ name: 'USER_ID', type: 'varchar', nullable: false })
  userId: string;

  @ManyToOne(() => OrganizationEntity, { nullable: false })
  @JoinColumn({
    name: 'ORGANIZATION_ID',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'TASK_ORGANIZATION_CONSTRAINT',
  })
  organization: OrganizationEntity;
  @Column({ name: 'ORGANIZATION_ID', type: 'varchar', nullable: false })
  organizationId: number;
}
