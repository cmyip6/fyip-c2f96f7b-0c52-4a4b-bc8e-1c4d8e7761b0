import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

export class BaseApiService {
  protected readonly http = inject(HttpClient);
  protected readonly apiUrl = environment.apiUrl;
}
