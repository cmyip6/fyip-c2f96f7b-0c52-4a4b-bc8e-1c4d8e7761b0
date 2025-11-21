import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private apiUrl = '/api';

  login(username: string, password: string) {
    return this.http.post<{ password: string; username: string }>(
      `${this.apiUrl}/auth/login`,
      {
        username,
        password,
      },
    );
  }
}
