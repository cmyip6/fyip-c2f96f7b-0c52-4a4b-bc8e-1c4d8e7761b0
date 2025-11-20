import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @Type(() => String)
  @IsNotEmpty()
  password: string;

  @IsBoolean()
  rememberMe: boolean = false;
}
