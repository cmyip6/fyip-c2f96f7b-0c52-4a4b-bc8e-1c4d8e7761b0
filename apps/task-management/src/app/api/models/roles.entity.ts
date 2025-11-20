import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Users } from './users.entity';
import { PropertyLength } from 'apps/task-management/src/libs/data/const/length.const';
import { Organizations } from './organizations.entity';

@Entity('ROLES')
@Unique('ROLES_NAME_ORGANIZATION_UNIQUE', ['name', 'organization'])
export class Roles extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: PropertyLength.TITLE,
    nullable: false,
  })
  name: string;

  @Column({ type: 'text', length: PropertyLength.TITLE, nullable: true })
  description: string;

  @ManyToOne(() => Organizations, (organization) => organization.roles, {
    nullable: true,
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organizations;
  @Column({ type: 'int', name: 'organization_id', nullable: true })
  organizationId: number;

  @OneToMany(() => Users, (user) => user.role)
  users: Users[];
}
