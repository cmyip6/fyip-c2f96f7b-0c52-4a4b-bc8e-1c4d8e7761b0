import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  ObjectLiteral,
  UpdateEvent,
} from 'typeorm';
import { BaseEntity } from '../base.entity';
import { ClsService } from 'nestjs-cls';
import { InjectDataSource } from '@nestjs/typeorm';

@EventSubscriber()
@Injectable()
export class BaseEntitySubscriber
  implements EntitySubscriberInterface, OnModuleInit
{
  @Inject(ClsService) protected readonly cls: ClsService;
  @InjectDataSource() protected readonly dataSource: DataSource;

  onModuleInit() {
    this.dataSource.subscribers.push(this);
  }

  private readonly logger = new Logger(BaseEntitySubscriber.name);

  beforeInsert(event: InsertEvent<BaseEntity>): void {
    if (!event.entity) return;

    this.logger.verbose(
      'Subscriber is fired on Before Insert:' + event.metadata.tableName,
    );
    this.updateFields(event.entity, true);
    this.logger.verbose('Entity configured successfully in Before Insert');
  }

  beforeUpdate(event: UpdateEvent<BaseEntity>): void {
    if (!event.entity) return;

    this.logger.verbose(
      'Subscriber is fired on Before Update:' + event.metadata.tableName,
    );
    this.updateFields(event.entity, false);
    this.logger.verbose('Entity configured successfully in Before Update');
  }

  private updateFields(
    entity: BaseEntity | ObjectLiteral,
    isInsert: boolean,
  ): void {
    const userId = this.cls.get('userId');
    if (userId) {
      entity.updatedAt = new Date();
      entity.updatedBy = userId;
      if (isInsert) {
        entity.createdAt = new Date();
        if (!entity.createdBy) {
          entity.createdBy = userId;
        }
      }
    }
  }
}
