import { CreateTaskResponseDto } from '@api/dto/create-task-response.dto';
import { CreateTaskDto } from '@api/dto/create-task.dto';
import {
  GetTaskResponseDto,
  GetTaskResponsePaginatedDto,
} from '@api/dto/get-task-response.dto';
import { FilterDto, PaginationDto } from '@api/dto/pagination.dto';
import { UpdateTaskDto } from '@api/dto/update-task.dto';
import { PermissionEntity } from '@api/models/permissions.entity';
import { TaskEntity } from '@api/models/tasks.entity';
import { UserEntity } from '@api/models/users.entity';
import { AuthUserInterface } from '@libs/data/type/auth-user.interface';
import { EntityTypeOptions } from '@libs/data/type/entity-type.enum';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { DeleteResult, IsNull, Repository, UpdateResult } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class TaskService {
  logger = new Logger(TaskService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepo: Repository<TaskEntity>,
  ) {}

  @Transactional()
  async createOne(
    dto: CreateTaskDto,
    user: AuthUserInterface,
  ): Promise<CreateTaskResponseDto> {
    const nextIndex = await this.getNextIndex(dto.organizationId);
    const createdTask = await this.taskRepo.save({
      ...dto,
      index: nextIndex,
      user: { id: user.id },
    });
    return plainToInstance(CreateTaskResponseDto, createdTask);
  }

  async getNextIndex(organizationId: number): Promise<number> {
    const lastTask = await this.taskRepo.findOne({
      where: {
        deletedAt: IsNull(),
        organizationId,
      },
      order: {
        index: 'DESC',
      },
    });

    if (!lastTask || lastTask.index == null) {
      return 0;
    }

    return lastTask.index + 1;
  }

  @Transactional()
  async updateOne(
    taskId: number,
    dto: UpdateTaskDto,
    user: AuthUserInterface,
  ): Promise<UpdateResult> {
    const foundTask = await this.taskRepo.findOneBy({
      id: taskId,
      deletedAt: IsNull(),
    });

    if (!foundTask) {
      throw new NotFoundException('Task not found: ' + taskId);
    }

    const { index, ...rest } = dto;
    if (index != undefined) {
      const currentTasks = await this.taskRepo.find({
        where: {
          deletedAt: IsNull(),
          organizationId: foundTask.organizationId,
        },
        order: { index: 'ASC' },
      });

      const currIndex = currentTasks.findIndex((x) => x.id === taskId);

      const taskToMove = currentTasks[currIndex];
      currentTasks.splice(currIndex, 1);
      currentTasks.splice(index, 0, taskToMove);
      await this.taskRepo.save(
        currentTasks.map((task, index) => ({
          ...task,
          index,
        })),
      );
    }

    const deleteResult = await this.taskRepo.update(taskId, {
      ...rest,
      updatedBy: user.id,
      updatedAt: new Date(),
    });
    return deleteResult;
  }

  @Transactional()
  async deleteOne(
    taskId: number,
    user: AuthUserInterface,
  ): Promise<DeleteResult> {
    const deleteResult = await this.taskRepo.update(taskId, {
      deletedAt: new Date(),
      deletedBy: user.id,
    });
    return deleteResult;
  }

  async getOneById(taskId: number): Promise<GetTaskResponseDto> {
    const taskDb = await this.taskRepo.findOne({ where: { id: taskId } });
    return plainToInstance(GetTaskResponseDto, taskDb);
  }

  async getAll(
    userId: string,
    organizationId: number,
    pagination: PaginationDto,
    filters: FilterDto,
  ): Promise<GetTaskResponsePaginatedDto> {
    const foundUser = await this.userRepo.findOne({
      where: { id: userId },
      relations: { roles: true },
    });
    if (!foundUser) {
      throw new BadRequestException('Invalid user id: ' + userId);
    }
    const role = foundUser.roles?.find(
      (el) => el.organizationId === organizationId,
    );

    if (!role) {
      throw new BadRequestException(
        'User does not have a role in the organization.',
      );
    }
    const { pageSize, pageNumber } = pagination;
    const { search } = filters;
    const ownerSubQuery = this.taskRepo
      .createQueryBuilder()
      .subQuery()
      .select(
        `
          jsonb_build_object(
            'id', "OU"."id",
            'name', "OU"."name",
            'email', "OU"."email"
          )
         `,
      )
      .from(UserEntity, 'OU')
      .where('OU.id = T.userId');

    const permissionSubQuery = this.taskRepo
      .createQueryBuilder()
      .subQuery()
      .select('1')
      .from(PermissionEntity, 'P')
      .innerJoin(UserEntity, 'U', 'U.id = T.userId')
      .where('P.entityType = :entityType', {
        entityType: EntityTypeOptions.TASK,
      })
      .andWhere('P.roleId = :roleId', { roleId: role.id });

    const getTaskQuery = this.taskRepo
      .createQueryBuilder('T')
      .select([
        'T.id AS "id"',
        'T.title AS "title"',
        'T.description AS "description"',
        'T.userId AS "userId"',
        'T.status AS "status"',
      ])
      .addSelect(`(${ownerSubQuery.getQuery()})`, 'user')
      .where(`EXISTS (${permissionSubQuery.getQuery()})`)
      .andWhere('T.organizationId = :organizationId', { organizationId })
      .andWhere('T.deletedAt IS NULL')
      .orderBy('T.index', 'ASC', 'NULLS LAST')
      .setParameters(permissionSubQuery.getParameters());

    if (search != undefined) {
      getTaskQuery.andWhere('T.title ILIKE :search', { search: `%${search}%` });
    }

    const countQuery = getTaskQuery.clone().getCount();

    const tasksDb = await getTaskQuery
      .take(pageSize)
      .skip(pageSize * (pageNumber - 1))
      .getRawMany();

    const count = await countQuery;

    return {
      data: tasksDb.map((taskDb) =>
        plainToInstance(GetTaskResponseDto, taskDb),
      ),
      metadata: {
        totalRecords: count,
        pageSize,
        pageNumber,
      },
    };
  }
}
