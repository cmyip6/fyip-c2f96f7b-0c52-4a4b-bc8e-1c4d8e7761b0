import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { BasePropertiesDto } from './base-properties.dto';

export class TaskResponseDto extends BasePropertiesDto {
  @IsNumber()
  id: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;
}
