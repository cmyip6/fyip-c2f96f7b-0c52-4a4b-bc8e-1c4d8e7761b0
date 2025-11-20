import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { PropertyLength } from 'apps/task-management/src/libs/data/const/length.const';
import { Organizations } from './organizations.entity';
import { Roles } from './roles.entity';

@Entity('USERS')
export class Users extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: PropertyLength.TITLE })
  username: string;

  @Column({ select: false })
  passwordHash: string;

  @ManyToOne(() => Roles, (roles) => roles.users, { nullable: false })
  @JoinColumn({ name: 'ROLE_ID' })
  role: Roles;
  @Column({ name: 'ROLE_ID', type: Number, nullable: false })
  roleId: number;

  @ManyToOne(() => Organizations, (org) => org.employees, { nullable: false })
  @JoinColumn({ name: 'ORGANIZATION_ID' })
  organization: Organizations;
  @Column({ name: 'ORGANIZATION_ID', type: Number, nullable: false })
  organizationId: number;

  @OneToMany(() => Task, (task) => task.assignedTo)
  tasks: Task[];
}
