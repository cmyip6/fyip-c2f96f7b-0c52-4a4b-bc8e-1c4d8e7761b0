import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GetOrganizationResponseDto } from './get-organization-response.dto';

export class GetRoleResponseDto {
  @IsNumber()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => GetOrganizationResponseDto)
  @IsOptional()
  @ValidateNested()
  organization?: GetOrganizationResponseDto;
}
