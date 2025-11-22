import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GetTaskResponseInterface } from '../../../libs/data/type/get-task-response.interface';
import { BaseApiService } from './base-api.service';

@Injectable({ providedIn: 'root' })
export class TaskApiService extends BaseApiService {
  getTasks(): Observable<GetTaskResponseInterface[]> {
    return this.http.get<GetTaskResponseInterface[]>(`${this.apiUrl}/task`);
  }

  createTask(
    task: Partial<GetTaskResponseInterface>,
  ): Observable<GetTaskResponseInterface> {
    return this.http.post<GetTaskResponseInterface>(
      `${this.apiUrl}/task`,
      task,
    );
  }

  updateTaskStatus(
    id: number,
    status: string,
  ): Observable<GetTaskResponseInterface> {
    return this.http.patch<GetTaskResponseInterface>(
      `${this.apiUrl}/task/${id}/status`,
      {
        status,
      },
    );
  }

  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/task/${id}`);
  }
}
