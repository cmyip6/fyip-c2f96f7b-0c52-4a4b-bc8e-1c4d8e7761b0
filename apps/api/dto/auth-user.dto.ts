import { AuthUserInterface } from '@libs/data/type/auth-user.interface';
import { IsOptional, IsString } from 'class-validator';

export class AuthUserDto {
  @IsString()
  authorization: string;
}

export class AuthUserResponseDto {
  user: AuthUserInterface;
}
