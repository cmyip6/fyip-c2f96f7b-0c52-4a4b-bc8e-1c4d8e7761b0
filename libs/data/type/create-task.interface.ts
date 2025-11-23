import { TaskStatusOptions } from './task-status.enum';

export interface CreateTaskInterface {
  organizationId: number;
  title: string;
  description?: string;
  status?: TaskStatusOptions;
}
