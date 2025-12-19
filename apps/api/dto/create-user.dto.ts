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
import { IsValidRole } from '../validator/role-exist.validator';
import { IsUserFieldUnique } from '../validator/user-field-unique.validator';

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
  @IsUserFieldUnique({
    message: 'Username has been taken, please select another one',
  })
  username: string;

  @ApiProperty({ description: 'User email', type: String })
  @IsNotEmpty()
  @IsEmail()
  @IsUserFieldUnique({
    message: 'Email has been registered trying logging in.',
  })
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
  @IsValidRole({ message: 'Role does not exist in the database' })
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
