import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Unique,
} from 'typeorm';

import { BaseEntity, UserEntity, RoleEntity } from '.';
import { PropertyLength } from '../../../libs/data/const';

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

  @OneToMany(() => UserEntity, (user) => user.organization)
  employees: UserEntity[];

  @OneToMany(() => RoleEntity, (role) => role.organization)
  roles: RoleEntity[];
}
