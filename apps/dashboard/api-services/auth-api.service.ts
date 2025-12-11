import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { LoginResponseInterface } from '@libs/data/type/log-in-response.interface';

@Injectable({ providedIn: 'root' })
export class AuthApiService extends BaseApiService {
  login(
    username: string,
    password: string,
    rememberMe: boolean,
  ): Observable<LoginResponseInterface> {
    return this.http.post<LoginResponseInterface>(`${this.apiUrl}/auth/login`, {
      username,
      password,
      rememberMe,
    });
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/logout`, {});
  }
}
