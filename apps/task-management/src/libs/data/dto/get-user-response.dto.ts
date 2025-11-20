import { IsString, IsNotEmpty, IsUUID, MaxLength } from 'class-validator';
import { PropertyLength } from '../const/length.const';

export interface Organization {
  id: string;
  name: string;
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  organizationId: string;
  organizationName?: string;
  passwordHash?: string; // Only used in backend logic
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  assignedToId: string;
  organizationId: string;
  createdAt: Date;
}

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
