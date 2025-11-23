import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { GetOrganizationResponseInterface } from '@libs/data/type/get-organization-response.interface';

@Injectable({ providedIn: 'root' })
export class OrganizationApiService extends BaseApiService {
  getOrganizations(): Observable<GetOrganizationResponseInterface[]> {
    return this.http.get<GetOrganizationResponseInterface[]>(
      `${this.apiUrl}/organization`,
    );
  }
}
