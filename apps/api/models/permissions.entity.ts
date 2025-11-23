import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { RoleEntity } from './roles.entity';
import { EntityTypeOptions } from '@libs/data/type/entity-type.enum';
import { PermissionLevelOptions } from '@libs/data/type/permission-level.enum';

@Entity('PERMISSIONS')
@Unique('ENTITY_PERMISSION_ROLE_UNIQUE', ['entityType', 'permission', 'roleId'])
export class PermissionEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'ENTITY_TYPE', type: 'varchar', nullable: false })
  entityType: EntityTypeOptions;

  @Column({ name: 'PERMISSION', type: 'varchar', nullable: false })
  permission: PermissionLevelOptions;

  @ManyToOne(() => RoleEntity, (role) => role.permissions, {
    nullable: false,
  })
  @JoinColumn({
    name: 'ROLE_ID',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'PERMISSION_ROLE_CONSTRAINT',
  })
  role: RoleEntity;
  @Column({ name: 'ROLE_ID', type: 'int', nullable: false })
  roleId: number;
}
