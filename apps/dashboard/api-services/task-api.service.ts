import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PaginatedResponseInterface } from '@libs/data/type/pagination-response.interface';
import { GetTaskResponseInterface } from '@libs/data/type/get-task-response.interface';
import { CreateTaskInterface } from '@libs/data/type/create-task.interface';
import { BaseApiService } from './base-api.service';
import { HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class TaskApiService extends BaseApiService {
  getTasks(
    organizationId: number,
    pageNumber: number = 1,
    pageSize: number = 9,
  ): Observable<PaginatedResponseInterface<GetTaskResponseInterface>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PaginatedResponseInterface<GetTaskResponseInterface>>(
      `${this.apiUrl}/task/organization/${organizationId}`,
      { params },
    );
  }

  createTask(dto: CreateTaskInterface): Observable<GetTaskResponseInterface> {
    return this.http.post<GetTaskResponseInterface>(`${this.apiUrl}/task`, dto);
  }

  updateTaskStatus(id: string | number, status: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/task/${id}`, {
      status,
    });
  }

  deleteTask(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/task/${id}`);
  }
}
