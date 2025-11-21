import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { BaseEntity, RoleEntity, TaskEntity } from '.';

@Entity('PERMISSIONS')
@Unique('TASK_ROLE_UNIQUE', ['task', 'role'])
export class PermissionEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => TaskEntity, (task) => task.permissions, {
    nullable: false,
  })
  @JoinColumn({
    name: 'TASK_ID',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'PERMISSION_TASK_CONSTRAINT',
  })
  task: TaskEntity;
  @Column({ name: 'TASK_ID', type: Number, nullable: false })
  taskId: number;

  @ManyToOne(() => RoleEntity, (role) => role.permissions, {
    nullable: false,
  })
  @JoinColumn({
    name: 'ROLE_ID',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'PERMISSION_ROLE_CONSTRAINT',
  })
  role: RoleEntity;
  @Column({ name: 'ROLE_ID', type: Number, nullable: false })
  roleId: number;
}
