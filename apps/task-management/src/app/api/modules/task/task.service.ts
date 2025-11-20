import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { GetTaskResponseDto } from '../../../../libs/data/dto';
import { DataSource, FindManyOptions, Repository } from 'typeorm';
import { TaskEntity, UserEntity } from '../../models';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class TaskService {
  logger = new Logger(TaskService.name);

  constructor(@Inject() private readonly dataSource: DataSource) {}

  get taskRepo(): Repository<TaskEntity> {
    return this.dataSource.getRepository<TaskEntity>(TaskEntity);
  }

  get userRepo(): Repository<UserEntity> {
    return this.dataSource.getRepository<UserEntity>(UserEntity);
  }

  async getOneById(taskId: number): Promise<GetTaskResponseDto> {
    const taskDb = await this.taskRepo.findOne({ where: { id: taskId } });
    return plainToInstance(GetTaskResponseDto, taskDb);
  }

  async getAll(userId: string): Promise<GetTaskResponseDto[]> {
    const foundUser = await this.userRepo.findOneBy({ id: userId });
    if (!foundUser) {
      throw new BadRequestException('Invalid user id' + userId);
    }

    let condition: FindManyOptions<TaskEntity> = {
      where: [{ createdBy: userId }],
    };

    if (foundUser.roleId) {
      condition = {
        where: [
          { createdBy: userId },
          { permissions: { roleId: foundUser.roleId } },
        ],
      };
    }

    const tasksDb = await this.taskRepo.find(condition);

    return tasksDb.map((taskDb) => plainToInstance(GetTaskResponseDto, taskDb));
  }
}
