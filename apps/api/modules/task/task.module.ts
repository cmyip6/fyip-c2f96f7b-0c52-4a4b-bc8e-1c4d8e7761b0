import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from '@api/models/tasks.entity';
import { UserEntity } from '@api/models/users.entity';
import { BaseEntitySubscriber } from '../../models/subscribers';

@Module({
  imports: [TypeOrmModule.forFeature([TaskEntity, UserEntity])],
  providers: [TaskService, BaseEntitySubscriber],
  controllers: [TaskController],
  exports: [TaskService],
})
export class TaskModule {}
