import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { OrganizationEntity } from './organizations.entity';

@Entity('ORGANIZATION_RELATION')
@Unique('ORGANIZATION_RELATION_UNIQ', [
  'parentOrganization',
  'childOrganization',
])
@Unique('ORGANIZATION_RELATION_UNIQ_CHILD', ['childOrganizationId'])
@Check(
  'ORGANIZATION_RELATION_CHECK',
  '"PARENT_ORGANIZATION_ID" <> "CHILD_ORGANIZATION_ID"',
)
@Index('ORGANIZATION_RELATION_CHILD_FOLDER_INDEX', ['childOrganizationId'])
@Index('ORGANIZATION_RELATION_PARENT_FOLDER_INDEX', ['parentOrganizationId'])
export class OrganizationRelationEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => OrganizationEntity, (item) => item.parentOrganizations, {
    nullable: true,
  })
  @JoinColumn({
    name: 'PARENT_ORGANIZATION_ID',
    referencedColumnName: 'id',
    foreignKeyConstraintName:
      'ORGANIZATION_RELATION_PARENT_ORGANIZATION_CONSTRAINT',
  })
  parentOrganization: OrganizationEntity;
  @Column({ name: 'PARENT_ORGANIZATION_ID', type: 'int', nullable: true })
  parentOrganizationId: number;

  @ManyToOne(() => OrganizationEntity, (item) => item.childOrganizations, {
    nullable: false,
  })
  @JoinColumn({
    name: 'CHILD_ORGANIZATION_ID',
    referencedColumnName: 'id',
    foreignKeyConstraintName:
      'ORGANIZATION_RELATION_CHILD_ORGANIZATION_CONSTRAINT',
  })
  childOrganization: OrganizationEntity;
  @Column({ name: 'CHILD_ORGANIZATION_ID', type: 'int', nullable: false })
  childOrganizationId: number;
}
