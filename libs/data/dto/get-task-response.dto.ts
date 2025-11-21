import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsUUID,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BasePropertiesDto } from './base-properties.dto';
import { GetUserReponseDto } from './get-user-response.dto';
import { TaskEntity } from '../../../apps/api/models';

export class GetTaskResponseDto extends BasePropertiesDto {
  constructor(task: TaskEntity) {
    super();
    this.id = task.id;
    this.title = task.title;
    this.description = task.description;
    this.status = task.status;
    this.deletedAt = task.deletedAt;
    this.deletedBy = task.deletedBy;
  }

  @IsNumber()
  id: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  deletedAt?: Date;

  @IsOptional()
  @IsUUID()
  deletedBy?: string;

  @IsUUID()
  userId: string;
  @Type(() => GetUserReponseDto)
  @IsOptional()
  @ValidateNested()
  user?: GetUserReponseDto;
}
