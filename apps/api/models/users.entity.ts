import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity, RoleEntity, OrganizationEntity } from '.';
import { PropertyLength } from '../../../libs/data/const';

@Entity('USERS')
@Unique('USER_USERNAME_UNIQUE', ['username'])
export class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: PropertyLength.TITLE, type: 'varchar' })
  username: string;

  @Column({ length: PropertyLength.TITLE, type: 'varchar' })
  email: string;

  @Column({ select: false, type: 'varchar', length: PropertyLength.PASSWORD })
  passwordHash: string;

  @Column({ type: 'text', nullable: true })
  token: string;

  @ManyToOne(() => RoleEntity, (roles) => roles.users, { nullable: true })
  @JoinColumn({
    name: 'ROLE_ID',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'USER_ROLE_CONSTRAINT',
  })
  role: RoleEntity;
  @Column({ name: 'ROLE_ID', type: Number, nullable: true })
  roleId: number;

  @ManyToOne(() => OrganizationEntity, (org) => org.employees, {
    nullable: true,
  })
  @JoinColumn({
    name: 'ORGANIZATION_ID',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'USER_ORGANIZATION_CONSTRAINT',
  })
  organization: OrganizationEntity;
  @Column({ name: 'ORGANIZATION_ID', type: Number, nullable: true })
  organizationId: number;
}
