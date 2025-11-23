import { Injectable, signal } from '@angular/core';

export interface AppError {
  statusCode: number;
  message: string | string[];
}

@Injectable({ providedIn: 'root' })
export class ErrorService {
  readonly error = signal<AppError | null>(null);

  showError(statusCode: number, message: string | string[]) {
    this.error.set({ statusCode, message });

    setTimeout(() => {
      this.clear();
    }, 5000);
  }

  clear() {
    this.error.set(null);
  }
}
