import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { AuthUserInterface } from '@libs/data/type/auth-user.interface';

@Injectable({ providedIn: 'root' })
export class UserApiService extends BaseApiService {
  getCurrentUser(): Observable<AuthUserInterface> {
    return this.http.get<AuthUserInterface>(`${this.apiUrl}/user`);
  }
}
