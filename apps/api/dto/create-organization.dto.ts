import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { PropertyLength } from '../../../libs/data/const/length.const';
import { IsValidOrganization } from '../validator/organization-exist.validator';

export class CreateOrganizationDto {
  @IsString()
  @MaxLength(PropertyLength.NAME)
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(PropertyLength.DESCRIPTION)
  description?: string;

  @IsNumber()
  @IsOptional()
  @IsValidOrganization()
  parentOrganizationId?: number;

  @IsNumber()
  @IsOptional()
  @IsValidOrganization()
  childOrganizationId?: number;
}

export class CreateOrganizationResponseDto {
  @IsNumber()
  id: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
