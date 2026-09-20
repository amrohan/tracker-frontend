import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ThemeMode, ThemeService } from '../../core/theme.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule],
  template: `
    <mat-toolbar class="bar">
      <a routerLink="/" class="brand" aria-label="Tracker home"><span class="mark">▤</span> Tracker</a>
      <span class="spacer"></span>

      <button mat-icon-button [matMenuTriggerFor]="themeMenu" aria-label="Change theme">
        <mat-icon>{{ icon() }}</mat-icon>
      </button>
      <mat-menu #themeMenu="matMenu">
        @for (opt of themes; track opt.mode) {
          <button mat-menu-item (click)="theme.mode.set(opt.mode)">
            <mat-icon>{{ opt.icon }}</mat-icon><span>{{ opt.label }}</span>
            @if (theme.mode() === opt.mode) { <mat-icon class="tick">check</mat-icon> }
          </button>
        }
      </mat-menu>

      <button mat-button [matMenuTriggerFor]="userMenu" class="user">
        <mat-icon>account_circle</mat-icon>
        <span class="name">{{ auth.user()?.displayName }}</span>
      </button>
      <mat-menu #userMenu="matMenu">
        <div class="who"><strong>{{ auth.user()?.displayName }}</strong><br /><span class="muted">{{ auth.user()?.email }}</span></div>
        <mat-divider />
        <button mat-menu-item (click)="auth.logout()"><mat-icon>logout</mat-icon><span>Sign out</span></button>
      </mat-menu>
    </mat-toolbar>
    <router-outlet />
  `,
  styles: `
    .bar { position: sticky; top: 0; z-index: 10; background: var(--mat-sys-surface-container); border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .brand { display: inline-flex; align-items: center; gap: 8px; font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.35rem; font-weight: 700; text-decoration: none; color: var(--mat-sys-on-surface); }
    .mark { color: var(--mat-sys-primary); font-size: 1.5rem; }
    .spacer { flex: 1 1 auto; }
    .who { padding: 12px 16px; }
    .tick { margin-left: auto; }
    @media (max-width: 600px) { .name { display: none; } }
  `,
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  protected readonly themes: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'light', label: 'Light', icon: 'light_mode' },
    { mode: 'dark', label: 'Dark', icon: 'dark_mode' },
    { mode: 'system', label: 'System', icon: 'brightness_auto' },
  ];

  protected icon(): string {
    return this.themes.find((t) => t.mode === this.theme.mode())?.icon ?? 'brightness_auto';
  }
}
