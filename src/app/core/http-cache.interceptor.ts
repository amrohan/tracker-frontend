import {
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, finalize, of, shareReplay, tap } from 'rxjs';
import { HttpCacheService } from './http-cache.service';

export const httpCacheInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const cache = inject(HttpCacheService);

  // Handle mutations (POST, PUT, PATCH, DELETE): let request pass through, then invalidate cache on success
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          cache.invalidateForMutation(req, event.body);
        }
      }),
    );
  }

  // Pass through if not a cacheable API GET request
  if (!cache.isCacheable(req)) {
    return next(req);
  }

  // Check bypass headers (e.g. Cache-control: no-cache or x-bypass-cache: true)
  const isBypass = req.headers.has('x-bypass-cache') || req.headers.get('cache-control') === 'no-cache';
  if (isBypass) {
    return next(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          cache.put(req, event);
        }
      }),
    );
  }

  // 1. Check in-memory cache
  const cachedResponse = cache.get(req);
  if (cachedResponse) {
    return of(cachedResponse);
  }

  // 2. Check active in-flight request for deduplication
  const inFlight$ = cache.getInFlight(req);
  if (inFlight$) {
    return inFlight$;
  }

  // 3. Perform network request, share in-flight, and cache response on success
  const network$ = next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        cache.put(req, event);
      }
    }),
    finalize(() => {
      cache.clearInFlight(req);
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  cache.setInFlight(req, network$);
  return network$;
};
