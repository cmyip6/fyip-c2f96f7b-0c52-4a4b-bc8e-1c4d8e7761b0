import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { RoleEntity } from './roles.entity';
import { PropertyLength } from '@libs/data/const/length.const';
import { UserTypeOptions } from '@libs/data/type/user-type.enum';

@Entity('USERS')
@Unique('USER_USERNAME_UNIQUE', ['username'])
export class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: PropertyLength.TITLE, type: 'varchar' })
  username: string;

  @Column({ length: PropertyLength.NAME, type: 'varchar' })
  name: string;

  @Column({ length: PropertyLength.TITLE, type: 'varchar' })
  email: string;

  @Column({ select: false, type: 'varchar', length: PropertyLength.PASSWORD })
  passwordHash: string;

  @Column({ type: 'text', nullable: true })
  token: string;

  @Column({
    name: 'USER_TYPE',
    type: 'varchar',
    nullable: false,
    default: UserTypeOptions.MODULE_USER,
  })
  userType: UserTypeOptions;

  @ManyToMany(() => RoleEntity, (role) => role.users, {
    cascade: false,
    nullable: true,
  })
  @JoinTable({
    name: 'USER_ROLES',
    joinColumn: {
      name: 'USER_ID',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'USER_ROLES_USER_FK',
    },
    inverseJoinColumn: {
      name: 'ROLE_ID',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'USER_ROLES_ROLE_FK',
    },
  })
  roles: RoleEntity[];
}
