import { IsString, IsNotEmpty, IsUUID, MaxLength } from 'class-validator';
import { PropertyLength } from '../const/length.const';

export class GetUserReponseDto {
  @IsUUID()
  id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(PropertyLength.TITLE)
  username: string;

  @IsString()
  @IsNotEmpty()
  roleId;
}
