import {
  Body,
  Controller,
  Delete,
  forwardRef,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TaskService } from './task.service';
import {
  GetTaskResponseDto,
  GetTaskResponsePaginatedDto,
} from '@api/dto/get-task-response.dto';
import { Admin, Viewer } from '@api/decorator/roles.decorator';
import { CheckPolicies } from '@api/decorator/policy-guard.decorator';
import { AuthUserInterface } from '@libs/data/type/auth-user.interface';
import { JwtAuthGuard } from '@api/guard/jwt-auth-guard';
import { PoliciesGuard } from '@api/guard/policy-guard';
import { RolesGuard } from '@api/guard/roles-guard';
import { ValidateResponse } from '@api/helper/response-validator';
import { User } from '@api/decorator/request-user.decorator';
import { CreateTaskDto } from '@api/dto/create-task.dto';
import { EntityTypeOptions } from '@libs/data/type/entity-type.enum';
import { PoliciesExecuter } from '@api/policies/task.policy';
import { CreateTaskResponseDto } from '@api/dto/create-task-response.dto';
import { DeleteResult } from 'typeorm';
import { UpdateTaskDto } from '@api/dto/update-task.dto';

@Controller('task')
@UseGuards(RolesGuard, PoliciesGuard, JwtAuthGuard)
export class TaskController {
  constructor(
    @Inject(forwardRef(() => TaskService))
    protected readonly service: TaskService,
  ) {}

  @Get(':taskId')
  @ValidateResponse(GetTaskResponseDto)
  @Viewer('params.taskId', EntityTypeOptions.TASK)
  @CheckPolicies(
    new PoliciesExecuter(EntityTypeOptions.TASK).Read('params.taskId'),
  )
  getOne(
    @Param('taskId', ParseIntPipe) taskId: number,
  ): Promise<GetTaskResponseDto> {
    return this.service.getOneById(taskId);
  }

  @Get('organization/:organizationId')
  @Viewer('params.organizationId')
  @ValidateResponse(GetTaskResponsePaginatedDto)
  @CheckPolicies(
    new PoliciesExecuter(EntityTypeOptions.ORGANIZATION).Read(
      'params.organizationId',
    ),
  )
  getAll(
    @User() user: AuthUserInterface,
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('pageSize', ParseIntPipe) pageSize = 10,
    @Query('pageNumber', ParseIntPipe) pageNumber = 1,
  ): Promise<GetTaskResponsePaginatedDto> {
    return this.service.getAll(user.id, organizationId, {
      pageSize,
      pageNumber,
    });
  }

  @Post()
  @ValidateResponse(CreateTaskResponseDto)
  @CheckPolicies(
    new PoliciesExecuter(EntityTypeOptions.ORGANIZATION).Create(
      'body.organizationId',
    ),
  )
  @Admin('body.organizationId')
  createOne(
    @Body() dto: CreateTaskDto,
    @User() user: AuthUserInterface,
  ): Promise<CreateTaskResponseDto> {
    return this.service.createOne(dto, user);
  }

  @Patch(':taskId')
  @CheckPolicies(
    new PoliciesExecuter(EntityTypeOptions.TASK).Update('params.taskId'),
  )
  @Admin('params.taskId', EntityTypeOptions.TASK)
  updateOne(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: UpdateTaskDto,
    @User() user: AuthUserInterface,
  ): Promise<DeleteResult> {
    return this.service.updateOne(taskId, dto, user);
  }

  @Delete(':taskId')
  @CheckPolicies(
    new PoliciesExecuter(EntityTypeOptions.TASK).Delete('params.taskId'),
  )
  @Admin('params.taskId', EntityTypeOptions.TASK)
  deleteOne(
    @Param('taskId', ParseIntPipe) taskId: number,
    @User() user: AuthUserInterface,
  ): Promise<DeleteResult> {
    return this.service.deleteOne(taskId, user);
  }
}
