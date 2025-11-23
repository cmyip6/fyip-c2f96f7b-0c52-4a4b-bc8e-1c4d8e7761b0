import { PropertyLength } from '@libs/data/const/length.const';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  MaxLength,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsEmail,
  IsArray,
} from 'class-validator';
import { GetRoleResponseDto } from './get-role-response.dto';
import { Type } from 'class-transformer';
import { GetOrganizationResponseDto } from './get-organization-response.dto';

export class GetUserReponseDto {
  @IsUUID()
  id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(PropertyLength.TITLE)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Type(() => GetRoleResponseDto)
  @ValidateNested({ each: true })
  @IsOptional()
  @IsArray()
  roles?: GetRoleResponseDto[];

  @IsNumber()
  @IsOptional()
  roleId?: number;

  @Type(() => GetOrganizationResponseDto)
  @ValidateNested()
  @IsOptional()
  organization?: GetOrganizationResponseDto;

  @IsNumber()
  @IsOptional()
  organizationId?: number;
}
