import { PropertyLength } from '@libs/data/const/length.const';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  MaxLength,
  IsNumber,
} from 'class-validator';

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
