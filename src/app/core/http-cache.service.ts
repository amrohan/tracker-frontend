import { HttpRequest, HttpResponse, HttpEvent } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.production';

export interface CacheEntry {
  response: HttpResponse<unknown>;
  timestamp: number;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class HttpCacheService {
  /** Default cache TTL: 5 minutes */
  private readonly defaultTtl = 5 * 60 * 1000;

  /** Maximum number of cached responses to prevent memory leaks */
  private readonly maxEntries = 200;

  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Observable<HttpEvent<unknown>>>();

  /**
   * Generates a stable normalized cache key from the request.
   * Query parameters are sorted to prevent different param order from causing cache misses.
   */
  makeKey(req: HttpRequest<unknown>): string {
    try {
      const baseUrl = environment.apiUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      const url = new URL(req.urlWithParams, baseUrl);
      const params = Array.from(url.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));
      const sortedSearch = new URLSearchParams(params).toString();
      return `${req.method}:${url.pathname}${sortedSearch ? '?' + sortedSearch : ''}`;
    } catch {
      return `${req.method}:${req.urlWithParams}`;
    }
  }

  /**
   * Determines if a request should be cached.
   * Only GET requests targeting /api/ (excluding auth and binary file exports) are cached.
   */
  isCacheable(req: HttpRequest<unknown>): boolean {
    if (req.method !== 'GET') return false;
    const url = req.url;
    if (url.includes('/api/auth/') || url.includes('/export')) return false;
    return url.includes('/api/');
  }

  /**
   * Retrieves a cached response if present and not expired.
   */
  get(req: HttpRequest<unknown>): HttpResponse<unknown> | null {
    const key = this.makeKey(req);
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.response.clone({
      body: this.cloneBody(entry.response.body),
    });
  }

  /**
   * Caches a successful HTTP response.
   */
  put(req: HttpRequest<unknown>, response: HttpResponse<unknown>, ttlMs?: number): void {
    if (response.status < 200 || response.status >= 300) return;

    const key = this.makeKey(req);
    const now = Date.now();
    const ttl = ttlMs ?? this.getTtlForUrl(req.url);

    // Evict oldest entry if size limit exceeded
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      response: response.clone({
        body: this.cloneBody(response.body),
      }),
      timestamp: now,
      expiresAt: now + ttl,
    });
  }

  /**
   * Active in-flight request deduplication.
   */
  getInFlight(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> | null {
    const key = this.makeKey(req);
    return this.inFlight.get(key) ?? null;
  }

  setInFlight(req: HttpRequest<unknown>, obs: Observable<HttpEvent<unknown>>): void {
    const key = this.makeKey(req);
    this.inFlight.set(key, obs);
  }

  clearInFlight(req: HttpRequest<unknown>): void {
    const key = this.makeKey(req);
    this.inFlight.delete(key);
  }

  /**
   * Invalidation: removes all cache entries matching a substring or regular expression.
   */
  invalidate(pattern: string | RegExp): void {
    for (const key of Array.from(this.cache.keys())) {
      const matches = typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key);
      if (matches) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidates all cache entries for a specific collection:
   * detail, records, summary, and dashboard lists.
   */
  invalidateCollection(collectionId: string): void {
    this.invalidate(`/api/collections/${collectionId}`);
    this.invalidate('/api/collections');
    this.invalidate(`/api/collections/${collectionId}/records`);
    this.invalidate(`/api/collections/${collectionId}/summary`);
  }

  /**
   * Automatically invalidates relevant caches based on mutation requests (POST, PUT, PATCH, DELETE).
   */
  invalidateForMutation(req: HttpRequest<unknown>, responseBody?: unknown): void {
    const url = req.url;

    // Collections list created: POST /api/collections
    if (url.endsWith('/api/collections')) {
      this.invalidate('/api/collections');
      return;
    }

    // Collection sub-resources: /api/collections/:id/...
    const collMatch = url.match(/\/api\/collections\/([^/?#]+)/);
    if (collMatch) {
      const collectionId = collMatch[1];
      this.invalidateCollection(collectionId);
      return;
    }

    // Direct record mutation: /api/records/:recordId
    const recMatch = url.match(/\/api\/records\/([^/?#]+)/);
    if (recMatch) {
      const recordId = recMatch[1];
      this.invalidate(`/api/records/${recordId}`);

      let collectionId: string | undefined;
      if (responseBody && typeof responseBody === 'object') {
        const anyBody = responseBody as Record<string, unknown>;
        if (anyBody['record'] && typeof anyBody['record'] === 'object') {
          collectionId = (anyBody['record'] as { collectionId?: string }).collectionId;
        } else if (typeof anyBody['collectionId'] === 'string') {
          collectionId = anyBody['collectionId'];
        }
      }

      if (collectionId) {
        this.invalidateCollection(collectionId);
      } else {
        this.invalidate('/records');
        this.invalidate('/summary');
        this.invalidate('/api/collections');
      }
      return;
    }

    // Direct field mutation: /api/fields/:fieldId
    if (url.includes('/api/fields/')) {
      this.invalidate('/api/collections');
      return;
    }

    // General fallback for any other API mutation
    if (url.includes('/api/')) {
      this.invalidate('/api/collections');
    }
  }

  /**
   * Clears the entire cache (e.g. On user logout).
   */
  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }

  private getTtlForUrl(url: string): number {
    if (url.includes('/api/meta/')) return 60 * 60 * 1000; // 1 hour for static metadata
    return this.defaultTtl; // 5 minutes default
  }

  private cloneBody<T>(body: T): T {
    if (body === null || body === undefined) return body;
    if (typeof body !== 'object') return body;
    try {
      return structuredClone(body);
    } catch {
      return JSON.parse(JSON.stringify(body));
    }
  }
}
