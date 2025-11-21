import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GetTaskResponseInterface } from '../../../libs/data/type';

@Injectable({ providedIn: 'root' })
export class TaskApiService {
  private http = inject(HttpClient);
  private apiUrl = '/api';

  // --- Tasks ---
  getTasks(): Observable<GetTaskResponseInterface[]> {
    return this.http.get<GetTaskResponseInterface[]>(`${this.apiUrl}/tasks`);
  }

  createTask(
    task: Partial<GetTaskResponseInterface>,
  ): Observable<GetTaskResponseInterface> {
    return this.http.post<GetTaskResponseInterface>(
      `${this.apiUrl}/tasks`,
      task,
    );
  }

  updateTaskStatus(
    id: number,
    status: string,
  ): Observable<GetTaskResponseInterface> {
    return this.http.patch<GetTaskResponseInterface>(
      `${this.apiUrl}/tasks/${id}/status`,
      {
        status,
      },
    );
  }

  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tasks/${id}`);
  }
}
