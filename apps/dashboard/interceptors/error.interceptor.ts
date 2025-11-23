import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ErrorService } from '../services/error.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorService = inject(ErrorService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const statusCode = err.status;

      let message = 'An unexpected error occurred';

      if (err.error && err.error.message) {
        message = err.error.message;
      } else if (err.message) {
        message = err.message;
      }

      if (statusCode === 401 && err.error?.action === 'LOGOUT') {
        document.cookie = 'token=; Max-Age=0; path=/;';
        router.navigate(['/login']);
      }

      errorService.showError(statusCode, message);

      return throwError(() => err);
    }),
  );
};
