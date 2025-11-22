import { PropertyLength } from '@libs/data/const/length.const';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MaxLength(PropertyLength.TITLE)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(PropertyLength.DESCRIPTION)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organizationId?: number;
}
