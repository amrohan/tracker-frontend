import { HttpClient } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthResponse, User } from './models';

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  /** Kept in memory only. The refresh token lives in an HttpOnly cookie the page cannot read. */
  readonly accessToken = signal<string | null>(null);
  readonly user = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.accessToken() !== null && this.user() !== null);

  private inFlight: Promise<boolean> | null = null;

  async login(body: { email: string; password: string }): Promise<void> {
    this.apply(await firstValueFrom(this.http.post<AuthResponse>('/api/auth/login', body)));
  }

  async register(body: { email: string; password: string; displayName: string }): Promise<void> {
    this.apply(await firstValueFrom(this.http.post<AuthResponse>('/api/auth/register', body)));
  }

  /** Single-flight: concurrent 401s share one refresh request. */
  refresh(): Promise<boolean> {
    if (!this.inFlight) {
      this.inFlight = this.doRefresh().finally(() => (this.inFlight = null));
    }
    return this.inFlight;
  }

  restoreSession(): Promise<boolean> {
    return this.refresh();
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/auth/logout', {}));
    } catch {
      /* the local session is cleared regardless */
    }
    this.clear();
    await this.router.navigateByUrl('/login');
  }

  /** Called when the session cannot be recovered. */
  expire(): void {
    this.clear();
    const returnUrl = this.router.url;
    void this.router.navigate(['/login'], { queryParams: returnUrl && returnUrl !== '/login' ? { returnUrl } : {} });
  }

  private async doRefresh(): Promise<boolean> {
    try {
      this.apply(await firstValueFrom(this.http.post<AuthResponse>('/api/auth/refresh', {})));
      return true;
    } catch {
      this.clear();
      return false;
    }
  }

  private apply(r: AuthResponse): void {
    this.accessToken.set(r.accessToken);
    this.user.set(r.user);
  }

  private clear(): void {
    this.accessToken.set(null);
    this.user.set(null);
  }
}
