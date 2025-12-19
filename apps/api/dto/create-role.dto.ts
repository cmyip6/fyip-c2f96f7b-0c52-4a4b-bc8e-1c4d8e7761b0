import { PropertyLength } from '@libs/data/const/length.const';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsValidOrganization } from '../validator/organization-exist.validator';

export class CreateRoleDto {
  @IsString()
  @MaxLength(PropertyLength.TITLE)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(PropertyLength.DESCRIPTION)
  description?: string;

  @IsInt()
  @IsValidOrganization({ message: 'Organization id is invalid' })
  organizationId: number;
}
