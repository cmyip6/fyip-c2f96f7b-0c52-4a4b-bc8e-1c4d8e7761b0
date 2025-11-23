import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Unique,
} from 'typeorm';

import { PropertyLength } from '@libs/data/const/length.const';
import { RoleEntity } from './roles.entity';
import { BaseEntity } from './base.entity';
import { OrganizationRelationEntity } from './organization-relation.entity';

@Entity('ORGANIZATIONS')
@Unique('ORGANIZATIONS_NAME_UNIQUE', ['name'])
export class OrganizationEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: PropertyLength.TITLE })
  name: string;

  @Column({
    type: 'varchar',
    length: PropertyLength.DESCRIPTION,
    nullable: true,
  })
  description: string | null = null;

  @OneToMany(() => RoleEntity, (role) => role.organization)
  roles: RoleEntity[];

  @OneToMany(() => OrganizationRelationEntity, (OR) => OR.parentOrganization)
  parentOrganizations: OrganizationRelationEntity[];

  @OneToMany(() => OrganizationRelationEntity, (OR) => OR.childOrganization)
  childOrganizations: OrganizationRelationEntity[];
}
