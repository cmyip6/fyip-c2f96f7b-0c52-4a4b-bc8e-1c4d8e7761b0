import { IsOptional, IsString } from 'class-validator';

export class AuthUserDto {
  @IsString()
  authorization: string;
}

export class AuthUserResponseDto {
  @IsString()
  token: string;

  @IsString()
  @IsOptional()
  refreshToken?: string;
}
