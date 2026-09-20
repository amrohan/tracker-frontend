import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const ANONYMOUS = /^\/api\/(auth\/(login|register|refresh|logout)|meta\/)/;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/') || ANONYMOUS.test(req.url)) return next(req);

  const auth = inject(AuthService);
  const withToken = (r: HttpRequest<unknown>) => {
    const token = auth.accessToken();
    return token ? r.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : r;
  };

  return next(withToken(req)).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        return from(auth.refresh()).pipe(
          switchMap((ok) => {
            if (ok) return next(withToken(req));
            auth.expire();
            return throwError(() => err);
          }),
        );
      }
      return throwError(() => err);
    }),
  );
};
