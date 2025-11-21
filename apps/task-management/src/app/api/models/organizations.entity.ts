import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Unique,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { UserEntity } from './users.entity';
import { PropertyLength } from 'apps/task-management/src/libs/data/const/length.const';
import { RoleEntity } from './roles.entity';

@Entity('ORGANIZATIONS')
@Unique('ORGANIZATIONS_NAME_UNIQUE', ['name'])
export class OrganizationEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: PropertyLength.TITLE })
  name: string;

  @Column({ type: 'text', length: PropertyLength.DESCRIPTION, nullable: true })
  description: string | null = null;

  @OneToMany(() => UserEntity, (user) => user.organization)
  employees: UserEntity[];

  @OneToMany(() => RoleEntity, (role) => role.organization)
  roles: RoleEntity[];
}
