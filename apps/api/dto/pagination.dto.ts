import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationDto {
  @IsNumber()
  @Max(1000)
  pageSize: number;

  @IsNumber()
  @Min(1)
  pageNumber: number;
}

export class FilterDto {
  @IsString()
  @IsOptional()
  search?: string;
}

export class PaginationResponseDto extends PaginationDto {
  @IsNumber()
  totalRecords: number;
}
