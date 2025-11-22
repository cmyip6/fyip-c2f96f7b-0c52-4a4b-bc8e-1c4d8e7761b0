import { GetTaskResponseDto } from '@api/dto/get-task-response.dto';
import { TaskEntity } from '@api/models/tasks.entity';
import { UserEntity } from '@api/models/users.entity';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { FindManyOptions, Repository } from 'typeorm';

@Injectable()
export class TaskService {
  logger = new Logger(TaskService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepo: Repository<TaskEntity>,
  ) {}

  async getOneById(taskId: number): Promise<GetTaskResponseDto> {
    const taskDb = await this.taskRepo.findOne({ where: { id: taskId } });
    return plainToInstance(GetTaskResponseDto, taskDb);
  }

  async getAll(userId: string): Promise<GetTaskResponseDto[]> {
    const foundUser = await this.userRepo.findOneBy({ id: userId });
    if (!foundUser) {
      throw new BadRequestException('Invalid user id: ' + userId);
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
