import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ErrorService } from '../services/error.service';
import { ResponseActionOptions } from '@libs/data/const/response-action.enum';

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

      if (statusCode === 401 && err.error?.action) {
        switch (err.error.action) {
          case ResponseActionOptions.LOGOUT: {
            router.navigate(['/login']);
            break;
          }
          case ResponseActionOptions.NULL: {
            console.log('No active session');
            return;
          }
          default:
            break;
        }
      }

      errorService.showError(statusCode, message);

      return throwError(() => err);
    }),
  );
};
