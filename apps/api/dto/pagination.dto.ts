import { IsNumber, Max, Min } from 'class-validator';

export class PaginationDto {
  @IsNumber()
  @Max(1000)
  pageSize: number;

  @IsNumber()
  @Min(1)
  pageNumber: number;
}

export class PaginationResponseDto extends PaginationDto {
  @IsNumber()
  totalRecords: number;
}
