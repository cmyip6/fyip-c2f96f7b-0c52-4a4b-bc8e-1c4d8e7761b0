import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { PropertyLength } from '@libs/data/const/length.const';
import { TaskStatusOptions } from '@libs/data/type/task-status.enum';
import { BasePropertiesDto } from './base-properties.dto';
import { Type } from 'class-transformer';

export class CreateTaskResponseDto extends BasePropertiesDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(PropertyLength.TITLE)
  title: string;

  @IsNumber()
  @Type(() => Number)
  organizationId: number;

  @IsString()
  @IsOptional()
  @MaxLength(PropertyLength.DESCRIPTION)
  description?: string;

  @IsEnum(TaskStatusOptions)
  status: TaskStatusOptions;
}
