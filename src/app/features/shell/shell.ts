import { Component, inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatDividerModule } from "@angular/material/divider";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatToolbarModule } from "@angular/material/toolbar";
import { RouterLink, RouterOutlet } from "@angular/router";
import { AuthService } from "../../core/auth.service";
import { ThemeMode, ThemeService } from "../../core/theme.service";

@Component({
  selector: "app-shell",
  imports: [
    RouterOutlet,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
  ],
  template: `
    <mat-toolbar class="bar">
      <div class="bar-inner">
        <!-- Brand -->
        <a routerLink="/" class="brand" aria-label="Tracker home">
          <span class="brand-name">Tracker</span>
        </a>

        <span class="spacer"></span>

        <!-- Theme -->
        <button
          mat-icon-button
          class="toolbar-button"
          [matMenuTriggerFor]="themeMenu"
          aria-label="Change theme"
          matTooltip="Change theme"
        >
          <mat-icon>{{ icon() }}</mat-icon>
        </button>

        <mat-menu #themeMenu="matMenu" class="theme-menu" xPosition="before">
          <div class="menu-title">Appearance</div>

          @for (opt of themes; track opt.mode) {
            <button
              mat-menu-item
              class="theme-option"
              [class.selected]="theme.mode() === opt.mode"
              (click)="theme.mode.set(opt.mode)"
            >
              <mat-icon>{{ opt.icon }}</mat-icon>
              <span>{{ opt.label }}</span>
            </button>
          }
        </mat-menu>

        <!-- User -->
        <button
          mat-icon-button
          class="avatar-button"
          [matMenuTriggerFor]="userMenu"
          aria-label="Account menu"
        >
          <span class="avatar">
            {{ initials() }}
          </span>
        </button>

        <mat-menu #userMenu="matMenu" xPosition="before">
          <div class="user-card">
            <div class="avatar large">
              {{ initials() }}
            </div>

            <div class="user-info">
              <strong>{{ auth.user()?.displayName || "User" }}</strong>
              <span>{{ auth.user()?.email }}</span>
            </div>
          </div>

          <mat-divider />

          <a mat-menu-item routerLink="/">
            <mat-icon>person_outline<</mat-icon><span>Profile</span>
          </a>

          <a mat-menu-item routerLink="/settings">
            <mat-icon>settings</mat-icon><span>Settings</span>
          </a>
          <mat-divider />

          <button mat-menu-item class="logout" (click)="auth.logout()">
            <mat-icon>logout</mat-icon>
            <span>Sign out</span>
          </button>
        </mat-menu>
      </div>
    </mat-toolbar>

    <main class="content">
      <router-outlet />
    </main>
  `,

  styles: `
    .bar {
      position: sticky;
      top: 0;
      z-index: 100;

      height: 64px;
      padding: 0;

      background: color-mix(in srgb, var(--mat-sys-surface) 92%, transparent);

      border-bottom: 1px solid var(--mat-sys-outline-variant);

      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }

    .bar-inner {
      width: 100%;
      height: 100%;

      display: flex;
      align-items: center;

      padding: 0 20px;
      box-sizing: border-box;
    }

    /* --------------------------------
       Brand
    -------------------------------- */

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;

      color: var(--mat-sys-on-surface);
      text-decoration: none;

      user-select: none;
    }

    .brand-mark {
      width: 34px;
      height: 34px;

      display: grid;
      place-items: center;

      border-radius: 10px;

      color: var(--mat-sys-on-primary);
      background: var(--mat-sys-primary);

      box-shadow: 0 2px 6px
        color-mix(in srgb, var(--mat-sys-primary) 25%, transparent);
    }

    .brand-mark mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
    }

    .brand-name {
      font-family: "Bricolage Grotesque", sans-serif;
      font-size: 1.3rem;
      font-weight: 700;
      letter-spacing: -0.025em;
    }

    .spacer {
      flex: 1;
    }

    /* --------------------------------
       Toolbar buttons
    -------------------------------- */

    .toolbar-button,
    .avatar-button {
      margin-left: 4px;

      color: var(--mat-sys-on-surface-variant);
    }

    .toolbar-button:hover {
      color: var(--mat-sys-on-surface);
      background: var(--mat-sys-surface-container-high);
    }

    /* --------------------------------
       Avatar
    -------------------------------- */

    .avatar-button {
      width: 44px;
      height: 44px;
    }

    .avatar {
      width: 32px;
      height: 32px;

      display: grid;
      place-items: center;

      border-radius: 50%;

      color: var(--mat-sys-on-primary-container);
      background: var(--mat-sys-primary-container);

      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .avatar.large {
      flex-shrink: 0;

      width: 42px;
      height: 42px;

      font-size: 0.9rem;
    }

    /* --------------------------------
       Menus
    -------------------------------- */

    .menu-title {
      padding: 10px 16px 6px;

      color: var(--mat-sys-on-surface-variant);

      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .theme-option {
      min-width: 180px;
    }

    .theme-option.selected {
      background: var(--mat-sys-secondary-container);
    }

    .tick {
      margin-left: auto;
      color: var(--mat-sys-primary);
    }

    /* --------------------------------
       User menu
    -------------------------------- */

    .user-card {
      display: flex;
      align-items: center;
      gap: 12px;

      padding: 14px 16px;
      min-width: 250px;
    }

    .user-info {
      min-width: 0;

      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .user-info strong {
      overflow: hidden;

      color: var(--mat-sys-on-surface);

      font-size: 0.9rem;
      font-weight: 600;

      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-info span {
      overflow: hidden;

      color: var(--mat-sys-on-surface-variant);

      font-size: 0.78rem;

      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .logout {
      color: var(--mat-sys-error);
    }

    /* --------------------------------
       Content
    -------------------------------- */

    .content {
      min-height: calc(100vh - 64px);
    }

    /* --------------------------------
       Mobile
    -------------------------------- */

    @media (max-width: 600px) {
      .bar-inner {
        padding: 0 12px;
      }

      .brand-name {
        font-size: 1.15rem;
      }

      .brand-mark {
        width: 32px;
        height: 32px;
      }

      .toolbar-button,
      .avatar-button {
        margin-left: 0;
      }
    }
  `,
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  protected readonly themes: {
    mode: ThemeMode;
    label: string;
    icon: string;
  }[] = [
    {
      mode: "light",
      label: "Light",
      icon: "light_mode",
    },
    {
      mode: "dark",
      label: "Dark",
      icon: "dark_mode",
    },
    {
      mode: "system",
      label: "System",
      icon: "brightness_auto",
    },
  ];

  protected icon(): string {
    return (
      this.themes.find((theme) => theme.mode === this.theme.mode())?.icon ??
      "brightness_auto"
    );
  }

  protected initials(): string {
    const name = this.auth.user()?.displayName?.trim();

    if (!name) {
      return "?";
    }

    const parts = name.split(/\s+/);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}
