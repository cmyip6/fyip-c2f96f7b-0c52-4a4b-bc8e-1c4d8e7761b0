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
import { Type } from 'class-transformer';

export class CreateTaskDto {
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
  @IsOptional()
  status?: TaskStatusOptions;
}
