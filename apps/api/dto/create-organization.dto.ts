import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { PropertyLength } from '../../../libs/data/const/length.const';

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
  parentOrganizationId?: number;

  @IsNumber()
  @IsOptional()
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
