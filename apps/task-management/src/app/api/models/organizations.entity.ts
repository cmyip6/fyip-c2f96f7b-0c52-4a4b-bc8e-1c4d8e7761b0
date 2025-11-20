import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Unique,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Users } from './users.entity';
import { PropertyLength } from 'apps/task-management/src/libs/data/const/length.const';
import { Roles } from './roles.entity';

@Entity('ORGANIZATIONS')
@Unique('ORGANIZATIONS_NAME_UNIQUE', ['name'])
export class Organizations extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: PropertyLength.TITLE })
  name: string;

  @Column({ type: 'text', length: PropertyLength.DESCRIPTION, nullable: true })
  description: string | null = null;

  @OneToMany(() => Users, (user) => user.organization)
  employees: Users[];

  @OneToMany(() => Roles, (role) => role.organization)
  roles: Roles[];
}
