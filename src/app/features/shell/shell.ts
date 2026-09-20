import { Component, inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
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
  ],

  template: `
    <!-- =====================================================
         HEADER
         ===================================================== -->

    <header class="shell-header">
      <mat-toolbar class="bar">
        <!-- ================= BRAND ================= -->

        <a routerLink="/" class="brand" aria-label="Tracker home">
          <!-- <span class="brand-mark" aria-hidden="true">
            <mat-icon>grid_view</mat-icon>
          </span> -->

          <span class="brand-name"> Tracker </span>
        </a>

        <span class="spacer"></span>

        <!-- ================= THEME ================= -->

        <button
          mat-icon-button
          class="toolbar-button"
          [matMenuTriggerFor]="themeMenu"
          aria-label="Change theme"
        >
          <mat-icon>
            {{ icon() }}
          </mat-icon>
        </button>

        <mat-menu #themeMenu="matMenu">
          <div class="menu-heading">Appearance</div>

          @for (opt of themes; track opt.mode) {
            <button
              mat-menu-item
              class="theme-option"
              (click)="theme.mode.set(opt.mode)"
            >
              <mat-icon>
                {{ opt.icon }}
              </mat-icon>

              <span class="option-label">
                {{ opt.label }}
              </span>

              @if (theme.mode() === opt.mode) {
                <mat-icon class="check"> check </mat-icon>
              }
            </button>
          }
        </mat-menu>

        <!-- ================= USER ================= -->

        <button
          mat-button
          class="user-button"
          [matMenuTriggerFor]="userMenu"
          aria-label="Open account menu"
        >
          <span class="avatar" aria-hidden="true">
            {{ initials() }}
          </span>
        </button>

        <!-- ================= USER MENU ================= -->

        <mat-menu #userMenu="matMenu">
          <div class="account-header">
            <span class="account-avatar" aria-hidden="true">
              {{ initials() }}
            </span>

            <div class="account-details">
              <strong>
                {{ auth.user()?.displayName }}
              </strong>

              <span>
                {{ auth.user()?.email }}
              </span>
            </div>
          </div>

          <div class="menu-separator"></div>

          <button mat-menu-item (click)="auth.logout()">
            <mat-icon> logout </mat-icon>

            <span> Sign out </span>
          </button>
        </mat-menu>
      </mat-toolbar>
    </header>

    <!-- ================= CONTENT ================= -->

    <main class="content">
      <router-outlet />
    </main>
  `,

  styles: `
    /* =========================================================
       HEADER
       ========================================================= */

    .shell-header {
      position: sticky;

      top: 0;

      z-index: 100;
    }

    /* =========================================================
       TOOLBAR
       ========================================================= */

    .bar {
      width: 100%;

      height: 64px;
      min-height: 64px;

      padding: 0 max(20px, calc((100vw - 1240px) / 2));

      display: flex;

      align-items: center;

      gap: 6px;

      background: color-mix(in srgb, var(--mat-sys-surface) 90%, transparent);

      color: var(--mat-sys-on-surface);

      border-bottom: 1px solid var(--mat-sys-outline-variant);

      backdrop-filter: blur(16px);

      -webkit-backdrop-filter: blur(16px);
    }

    /* =========================================================
       BRAND
       ========================================================= */

    .brand {
      display: inline-flex;

      align-items: center;

      gap: 10px;

      padding: 6px 8px;

      margin-left: -8px;

      border-radius: 12px;

      color: var(--mat-sys-on-surface);

      text-decoration: none;

      transition: background 140ms ease;
    }

    .brand:hover {
      background: var(--mat-sys-surface-container);
    }

    .brand:focus-visible {
      outline: 2px solid var(--mat-sys-primary);

      outline-offset: 2px;
    }

    .brand-mark {
      width: 34px;
      height: 34px;

      display: grid;

      place-items: center;

      flex-shrink: 0;

      border-radius: 10px;

      background: var(--mat-sys-primary);

      color: var(--mat-sys-on-primary);

      box-shadow: var(--mat-sys-level1);
    }

    .brand-mark mat-icon {
      width: 20px;
      height: 20px;

      font-size: 20px;
    }

    .brand-name {
      font-family: "Bricolage Grotesque", "Figtree", system-ui, sans-serif;

      font-size: 1.25rem;

      font-weight: 700;

      line-height: 1;

      letter-spacing: -0.02em;
    }

    /* =========================================================
       SPACER
       ========================================================= */

    .spacer {
      flex: 1 1 auto;
    }

    /* =========================================================
       THEME BUTTON
       ========================================================= */

    .toolbar-button {
      width: 42px;
      height: 42px;

      flex-shrink: 0;

      color: var(--mat-sys-on-surface-variant);
    }

    .toolbar-button:hover {
      background: var(--mat-sys-surface-container);
    }

    /* =========================================================
       USER BUTTON
       ========================================================= */

    .user-button {
      height: 46px;

      min-width: 0;

      max-width: 230px;

      display: inline-flex;

      align-items: center;

      gap: 10px;

      padding: 4px 12px 4px 6px;

      margin-left: 4px;

      border-radius: 14px;

      color: var(--mat-sys-on-surface);

      white-space: nowrap;
    }

    .user-button:hover {
      background: var(--mat-sys-surface-container);
    }

    .user-button:focus-visible {
      outline: 2px solid var(--mat-sys-primary);

      outline-offset: 2px;
    }

    /* =========================================================
       USER AVATAR
       ========================================================= */

    .avatar {
      width: 34px;
      height: 34px;

      display: grid;

      place-items: center;

      flex-shrink: 0;

      border-radius: 50%;

      background: var(--mat-sys-secondary-container);

      color: var(--mat-sys-on-secondary-container);

      font-size: 0.8rem;

      font-weight: 700;

      letter-spacing: 0.02em;
    }

    /* =========================================================
       USER NAME
       ========================================================= */

    .user-name {
      display: block;

      min-width: 0;

      max-width: 180px;

      overflow: hidden;

      text-overflow: ellipsis;

      white-space: nowrap;

      font-size: 0.9rem;

      font-weight: 600;

      line-height: 1.2;
    }

    /* =========================================================
       THEME MENU
       ========================================================= */

    .menu-heading {
      padding: 10px 16px 6px;

      color: var(--mat-sys-on-surface-variant);

      font-size: 0.75rem;

      font-weight: 600;

      letter-spacing: 0.04em;

      text-transform: uppercase;
    }

    .theme-option {
      min-width: 190px;
    }

    .option-label {
      flex: 1;
    }

    .check {
      margin-left: auto;

      color: var(--mat-sys-primary);
    }

    /* =========================================================
       ACCOUNT MENU
       ========================================================= */

    .account-header {
      display: flex;

      align-items: center;

      gap: 12px;

      padding: 14px 16px;
    }

    .account-avatar {
      width: 42px;
      height: 42px;

      display: grid;

      place-items: center;

      flex-shrink: 0;

      border-radius: 50%;

      background: var(--mat-sys-primary-container);

      color: var(--mat-sys-on-primary-container);

      font-size: 0.85rem;

      font-weight: 700;
    }

    .account-details {
      min-width: 0;

      display: flex;

      flex-direction: column;

      gap: 2px;
    }

    .account-details strong {
      display: block;

      max-width: 220px;

      overflow: hidden;

      text-overflow: ellipsis;

      white-space: nowrap;

      font-size: 0.9rem;
    }

    .account-details span {
      display: block;

      max-width: 220px;

      overflow: hidden;

      text-overflow: ellipsis;

      white-space: nowrap;

      color: var(--mat-sys-on-surface-variant);

      font-size: 0.8rem;
    }

    .menu-separator {
      height: 1px;

      margin: 0 8px;

      background: var(--mat-sys-outline-variant);
    }

    /* =========================================================
       CONTENT
       ========================================================= */

    .content {
      min-height: calc(100vh - 64px);
    }

    /* =========================================================
       MOBILE
       ========================================================= */

    @media (max-width: 640px) {
      .bar {
        height: 58px;
        min-height: 58px;

        padding: 0 12px;
      }

      .content {
        min-height: calc(100vh - 58px);
      }

      .brand {
        margin-left: -4px;

        gap: 8px;
      }

      .brand-mark {
        width: 32px;
        height: 32px;

        border-radius: 9px;
      }

      .brand-name {
        font-size: 1.15rem;
      }

      .toolbar-button {
        width: 40px;
        height: 40px;
      }

      /*
       * On phones:
       *
       *     [ avatar ]
       *
       * instead of:
       *
       *     [ avatar ] Rohan Salunkhe
       *
       * This gives the header much more breathing room.
       */
      .user-button {
        width: 40px;
        height: 40px;

        padding: 3px;

        margin-left: 0;

        justify-content: center;

        border-radius: 12px;
      }

      .user-name {
        display: none;
      }

      .avatar {
        width: 34px;
        height: 34px;
      }
    }

    /* =========================================================
       VERY SMALL PHONES
       ========================================================= */

    @media (max-width: 380px) {
      .bar {
        padding: 0 8px;
      }

      .brand-name {
        display: none;
      }

      .brand {
        padding: 4px;
      }

      .toolbar-button {
        width: 38px;
        height: 38px;
      }

      .user-button {
        width: 38px;
        height: 38px;
      }
    }

    /* =========================================================
       REDUCED MOTION
       ========================================================= */

    @media (prefers-reduced-motion: reduce) {
      .brand,
      .toolbar-button,
      .user-button {
        transition: none;
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

    const parts = name.split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}
