import { CreateDateColumn, UpdateDateColumn, Column } from 'typeorm';

export class BaseEntity {
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'varchar', name: 'created_by', nullable: true })
  createdBy: string;

  @Column({ type: 'varchar', name: 'updated_by', nullable: true })
  updatedBy: string;
}
