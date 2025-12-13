import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PermissionLevelOptions } from '../../../libs/data/type/permission-level.enum';
import { PropertyLength } from '../../../libs/data/const/length.const';
import { EntityTypeOptions } from '../../../libs/data/type/entity-type.enum';
import { Type } from 'class-transformer';

class PermissionDto {
  @IsEnum(PermissionLevelOptions)
  permission: PermissionLevelOptions;

  @IsEnum(EntityTypeOptions)
  entityType: EntityTypeOptions;
}

class PermissionsDto {
  @Type(() => PermissionDto)
  @ValidateNested({ each: true })
  @IsOptional()
  @IsArray()
  insert?: PermissionDto[];

  @Type(() => PermissionDto)
  @ValidateNested({ each: true })
  @IsOptional()
  @IsArray()
  delete?: PermissionDto[];
}

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  @MaxLength(PropertyLength.NAME)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(PropertyLength.DESCRIPTION)
  description?: string;

  @Type(() => PermissionsDto)
  @ValidateNested()
  @IsOptional()
  permissions?: PermissionsDto;

  @IsNumber()
  organizationId: number;
}
