import { Injectable, signal } from '@angular/core';

export interface AppError {
  statusCode: number;
  message: string | string[];
}

@Injectable({ providedIn: 'root' })
export class ErrorService {
  readonly error = signal<AppError | null>(null);

  private timeoutId: any;

  showError(statusCode: number, message: string | string[]) {
    // fixed on 24/11
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.error.set({ statusCode, message });

    this.timeoutId = setTimeout(() => {
      this.clear();
    }, 5000);
  }

  clear() {
    this.error.set(null);
  }
}
