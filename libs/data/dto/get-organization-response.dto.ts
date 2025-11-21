import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class GetOrganizationResponseDto {
  @IsNumber()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  //   employees;
  //   roles;
}
