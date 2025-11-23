import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PaginatedResponseInterface } from '@libs/data/type/pagination-response.interface';
import { GetTaskResponseInterface } from '@libs/data/type/get-task-response.interface';
import { BaseApiService } from './base-api.service';
import { HttpParams } from '@angular/common/http';
import { GetOrganizationResponseInterface } from '@libs/data/type/get-organization-response.interface';

@Injectable({ providedIn: 'root' })
export class OrganizationApiService extends BaseApiService {
  getOrganizations(): Observable<GetOrganizationResponseInterface[]> {
    return this.http.get<GetOrganizationResponseInterface[]>(
      `${this.apiUrl}/organization`,
    );
  }
}
