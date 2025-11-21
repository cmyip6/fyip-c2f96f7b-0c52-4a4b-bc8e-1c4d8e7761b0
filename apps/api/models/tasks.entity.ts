import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { PropertyLength } from '../../../libs/data/const';
import { UserEntity, PermissionEntity } from '.';

@Entity('TASKS')
export class TaskEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'TITLE', type: 'varchar', length: PropertyLength.TITLE })
  title: string;

  @Column({ name: 'DESCRIPTION', type: 'json', nullable: true })
  description: string;

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
  User: UserEntity;
  @Column({ name: 'USER_ID', type: 'varchar', nullable: false })
  userId: string;

  @OneToMany(() => PermissionEntity, (permission) => permission.task)
  permissions: PermissionEntity[];
}
