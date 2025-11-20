import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RolesGuard } from '../../guard/roles-guard';
import { PoliciesGuard } from '../../guard/policy-guard';
import { CheckPolicies, Viewer } from '../../guard';
import { ValidateResponse } from '../../helper';
import { TaskResponseDto } from '../../../../libs/data/dto';
import { TaskService } from './task.service';
import { User } from '../../decorator/request-user.decorator';
import { AuthUserInterface } from '../../../../libs/data/type';

@Controller('task')
@UseGuards(RolesGuard, PoliciesGuard)
export class TaskController {
  constructor(protected readonly service: TaskService) {}

  @Get('/:taskId')
  @CheckPolicies('param.id')
  @ValidateResponse(TaskResponseDto)
  @CheckPolicies('params.taskId')
  getOne(
    @Param('taskId', ParseIntPipe) taskId: number,
  ): Promise<TaskResponseDto> {
    return this.service.getOneById(taskId);
  }

  @Get()
  @Viewer()
  @ValidateResponse(TaskResponseDto, { isArray: true })
  getAll(@User() user: AuthUserInterface): Promise<TaskResponseDto[]> {
    return this.service.getAll(user.id);
  }
}
