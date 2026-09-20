import { HttpErrorResponse } from '@angular/common/http';

interface Problem { title?: string; status?: number; errors?: Record<string, string[]>; [k: string]: unknown; }

function problem(e: unknown): Problem | null {
  return e instanceof HttpErrorResponse && e.error && typeof e.error === 'object' ? (e.error as Problem) : null;
}

export function problemMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return 'Cannot reach the server. Check your connection.';
    if (e.status === 429) return 'Too many attempts. Please wait a minute and try again.';
    const p = problem(e);
    if (p?.errors) {
      const first = Object.values(p.errors)[0]?.[0];
      if (first) return first;
    }
    if (p?.title) return p.title;
  }
  return fallback;
}

export function fieldErrors(e: unknown): Record<string, string[]> {
  return problem(e)?.errors ?? {};
}

export function httpStatus(e: unknown): number | null {
  return e instanceof HttpErrorResponse ? e.status : null;
}

export function problemExtension<T>(e: unknown, key: string): T | undefined {
  return problem(e)?.[key] as T | undefined;
}
