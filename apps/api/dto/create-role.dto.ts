import { PropertyLength } from '@libs/data/const/length.const';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MaxLength(PropertyLength.TITLE)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(PropertyLength.DESCRIPTION)
  description?: string;

  @IsInt()
  organizationId: number;
}
