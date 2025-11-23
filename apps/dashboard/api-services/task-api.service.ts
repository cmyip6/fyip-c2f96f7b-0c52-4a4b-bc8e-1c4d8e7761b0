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
    search?: string,
  ): Observable<PaginatedResponseInterface<GetTaskResponseInterface>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<PaginatedResponseInterface<GetTaskResponseInterface>>(
      `${this.apiUrl}/task/organization/${organizationId}`,
      { params },
    );
  }

  createTask(dto: CreateTaskInterface): Observable<GetTaskResponseInterface> {
    return this.http.post<GetTaskResponseInterface>(`${this.apiUrl}/task`, dto);
  }

  updateTask(
    id: number,
    data: Partial<GetTaskResponseInterface>,
  ): Observable<GetTaskResponseInterface> {
    return this.http.patch<GetTaskResponseInterface>(
      `${this.apiUrl}/task/${id}`,
      data,
    );
  }

  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/task/${id}`);
  }
}
