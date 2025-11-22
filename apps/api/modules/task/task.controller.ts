import {
  Controller,
  forwardRef,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { GetTaskResponseDto } from '@api/dto/get-task-response.dto';
import { Viewer } from '@libs/auth/decorator/roles.decorator';
import { CheckPolicies } from '@libs/auth/decorator/policy-guard.decorator';
import { AuthUserInterface } from '@libs/data/type/auth-user.interface';
import { JwtAuthGuard } from '@api/guard/jwt-auth-guard';
import { PoliciesGuard } from '@api/guard/policy-guard';
import { RolesGuard } from '@api/guard/roles-guard';
import { ValidateResponse } from '@api/helper/response-validator';
import { User } from '@api/decorator/request-user.decorator';

@Controller('task')
@UseGuards(RolesGuard, PoliciesGuard, JwtAuthGuard)
export class TaskController {
  constructor(
    @Inject(forwardRef(() => TaskService))
    protected readonly service: TaskService,
  ) {}

  @Get(':taskId')
  @ValidateResponse(GetTaskResponseDto)
  @Viewer()
  @CheckPolicies('params.taskId')
  getOne(
    @Param('taskId', ParseIntPipe) taskId: number,
  ): Promise<GetTaskResponseDto> {
    return this.service.getOneById(taskId);
  }

  @Get()
  @Viewer()
  @ValidateResponse(GetTaskResponseDto, { isArray: true })
  getAll(@User() user: AuthUserInterface): Promise<GetTaskResponseDto[]> {
    return this.service.getAll(user.id);
  }
}
