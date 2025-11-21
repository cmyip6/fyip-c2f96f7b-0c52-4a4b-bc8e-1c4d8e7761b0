import { BasePropertiesInterface } from './base-properties.interface';
import { GetUserReponseInterface } from './get-user-response.interface';

export interface GetTaskResponseInterface extends BasePropertiesInterface {
  id: number;
  title: string;
  description?: string;
  status?: string;
  deletedAt?: Date;
  deletedBy?: string;
  userId: string;
  user?: GetUserReponseInterface;
}
