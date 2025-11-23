import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsUUID,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GetUserReponseDto } from './get-user-response.dto';
import { BasePropertiesDto } from './base-properties.dto';
import { PaginationResponseDto } from './pagination.dto';

export class GetTaskResponseDto extends BasePropertiesDto {
  @IsNumber()
  id: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsUUID()
  userId: string;

  @Type(() => GetUserReponseDto)
  @IsOptional()
  @ValidateNested()
  user?: GetUserReponseDto;
}

export class GetTaskResponsePaginatedDto {
  @Type(() => GetTaskResponseDto)
  @ValidateNested({ each: true })
  @IsArray()
  data: GetTaskResponseDto[];

  @Type(() => PaginationResponseDto)
  @ValidateNested()
  metadata: PaginationResponseDto;
}
