import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { PropertyLength } from '@libs/data/const/length.const';
import { TaskStatusOptions } from '@libs/data/type/task-status.enum';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  @MaxLength(PropertyLength.TITLE)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(PropertyLength.DESCRIPTION)
  description?: string;

  @IsEnum(TaskStatusOptions)
  @IsOptional()
  status?: TaskStatusOptions;

  @IsNumber()
  @IsOptional()
  index?: number;
}
