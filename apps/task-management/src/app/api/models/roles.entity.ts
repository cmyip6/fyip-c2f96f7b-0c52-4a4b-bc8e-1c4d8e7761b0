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
import { UserEntity } from './users.entity';
import { OrganizationEntity } from './organizations.entity';
import { PermissionEntity } from './permissions.entity';
import { PropertyLength } from '../../../libs/data/const';

@Entity('ROLES')
@Unique('ROLES_NAME_ORGANIZATION_UNIQUE', ['name', 'organization'])
export class RoleEntity extends BaseEntity {
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

  @ManyToOne(() => OrganizationEntity, (organization) => organization.roles, {
    nullable: true,
  })
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationEntity;
  @Column({ type: 'int', name: 'organization_id', nullable: true })
  organizationId: number;

  @OneToMany(() => UserEntity, (user) => user.role)
  users: UserEntity[];

  @OneToMany(() => PermissionEntity, (permission) => permission.role)
  permissions: PermissionEntity[];
}
