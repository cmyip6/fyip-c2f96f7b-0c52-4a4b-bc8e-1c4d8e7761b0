import {
  IsString,
  IsNotEmpty,
  IsUUID,
  MaxLength,
  IsNumber,
} from 'class-validator';

import { PropertyLength } from '../const/length.const';

export class GetUserReponseDto {
  @IsUUID()
  id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(PropertyLength.TITLE)
  username: string;

  @IsNumber()
  @IsNotEmpty()
  roleId: number;
}
