import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PropertyLength } from '@libs/data/const/length.const';
import { PASSWORD_REGEX } from '../helper/password.regex';

export class CreateUserDto {
  @ApiProperty({ description: 'User Password', type: String })
  @IsNotEmpty()
  @IsString()
  @Type(() => String)
  @MinLength(10, { message: 'Password must be at least 10 characters long' })
  @Matches(PASSWORD_REGEX, {
    message:
      'Password must be at least 10 characters long, contain one uppercase letter, one lowercase letter, one number, one special character, and no spaces',
  })
  password: string;

  @ApiProperty({ description: 'Username', type: String })
  @IsNotEmpty()
  @IsString()
  @Type(() => String)
  username: string;

  @ApiProperty({ description: 'User email', type: String })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User first name',
    type: String,
    maxLength: PropertyLength.NAME,
  })
  @MaxLength(PropertyLength.NAME)
  @IsString()
  name: string;

  @IsNumber()
  roleId: number;
}

export class CreateUserResponseDto extends PickType(CreateUserDto, [
  'email',
  'name',
  'username',
  'roleId',
]) {
  @IsNumber()
  id: number;
}
