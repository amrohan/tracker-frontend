import { Component, inject } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";
import { NzAvatarModule } from "ng-zorro-antd/avatar";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzDropdownModule } from "ng-zorro-antd/dropdown";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzMenuModule } from "ng-zorro-antd/menu";
import { AuthService } from "../../core/auth.service";
import { NzThemeType, ThemeService } from "../../core/theme.service";

@Component({
  selector: "app-shell",
  imports: [
    RouterOutlet,
    RouterLink,
    NzButtonModule,
    NzIconModule,
    NzDropdownModule,
    NzMenuModule,
    NzAvatarModule,
  ],
  template: `
    <header class="bar">
      <div class="bar-inner">
        <!-- Brand -->
        <a routerLink="/" class="brand" aria-label="Tracker home">
          <span class="brand-name">Tracker</span>
        </a>

        <span class="spacer"></span>

        <div class="flex gap-3 items-center justify-end">
          <!-- Theme Menu -->
          <button
            class="mt-2!"
            nz-button
            nzType="text"
            nzShape="circle"
            nz-dropdown
            [nzDropdownMenu]="themeMenu"
            aria-label="Change theme"
          >
            <nz-icon [nzType]="icon()" />
          </button>

          <nz-dropdown-menu #themeMenu="nzDropdownMenu">
            <ul nz-menu>
              <li nz-menu-group nzTitle="Official Themes">
                <ul>
                  @for (opt of themes; track opt.type) {
                    <li
                      nz-menu-item
                      [nzSelected]="theme.nzTheme() === opt.type"
                      (click)="theme.nzTheme.set(opt.type)"
                    >
                      <nz-icon [nzType]="opt.icon" />
                      <span class="menu-label">{{ opt.label }}</span>
                    </li>
                  }
                </ul>
              </li>
            </ul>
          </nz-dropdown-menu>

          <!-- User Menu -->
          <button
            nz-button
            nzType="text"
            nzShape="circle"
            nz-dropdown
            [nzDropdownMenu]="userMenu"
            aria-label="Account menu"
          >
            <nz-avatar class="avatar" [nzText]="initials()" />
          </button>

          <nz-dropdown-menu #userMenu="nzDropdownMenu">
            <ul nz-menu>
              <li nz-menu-item class="user-card-item" [nzDisabled]="true">
                <div class="user-card">
                  <nz-avatar class="avatar-large" [nzText]="initials()" />
                  <div class="user-info">
                    <strong>{{ auth.user()?.displayName || "User" }}</strong>
                    <span class="user-email">{{ auth.user()?.email }}</span>
                  </div>
                </div>
              </li>
              <li nz-menu-divider></li>
              <li nz-menu-item>
                <a routerLink="/settings">
                  <nz-icon nzType="setting" />
                  <span class="menu-label">Settings</span>
                </a>
              </li>
              <li nz-menu-divider></li>
              <li nz-menu-item nzDanger (click)="auth.logout()">
                <nz-icon nzType="logout" />
                <span class="menu-label">Sign out</span>
              </li>
            </ul>
          </nz-dropdown-menu>
        </div>
      </div>
    </header>

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
      background: color-mix(in srgb, var(--app-surface) 92%, transparent);
      border-bottom: 1px solid var(--app-outline-variant);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      transition:
        background-color 0.2s ease,
        border-color 0.2s ease;
    }

    .bar-inner {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      padding: 0 20px;
      box-sizing: border-box;
      max-width: 1240px;
      margin: 0 auto;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: var(--app-text);
      text-decoration: none;
      user-select: none;
    }

    .brand-name {
      font-family: "Bricolage Grotesque", sans-serif;
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      color: var(--app-text);
    }

    .spacer {
      flex: 1;
    }

    .toolbar-button,
    .avatar-button {
      margin-left: 6px;
      color: var(--app-text-muted);
      font-size: 18px;
    }

    .toolbar-button:hover,
    .avatar-button:hover {
      color: var(--app-text);
    }

    .avatar {
      background-color: var(--app-primary);
      color: #fff;
      font-size: 12px;
      font-weight: 700;
    }

    .avatar-large {
      background-color: var(--app-primary);
      color: #fff;
      font-weight: 700;
      width: 40px;
      height: 40px;
      line-height: 40px;
      font-size: 15px;
      flex-shrink: 0;
    }

    .menu-label {
      margin-left: 8px;
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 4px;
      min-width: 200px;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
    }

    .user-info strong {
      color: var(--app-text);
      font-size: 0.95rem;
    }

    .user-email {
      font-size: 0.8rem;
      color: var(--app-text-muted);
    }

    .content {
      min-height: calc(100vh - 64px);
    }

    @media (max-width: 600px) {
      .bar-inner {
        padding: 0 12px;
      }
      .brand-name {
        font-size: 1.2rem;
      }
    }
  `,
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  protected readonly themes: {
    type: NzThemeType;
    label: string;
    icon: string;
  }[] = [
    { type: "default", label: "Default (Light)", icon: "bulb" },
    { type: "dark", label: "Dark", icon: "bulb" },
    { type: "compact", label: "Compact", icon: "table" },
    { type: "aliyun", label: "Aliyun (Enterprise)", icon: "cloud" },
    { type: "system", label: "Match System", icon: "setting" },
  ];

  protected icon(): string {
    const t = this.theme.nzTheme();
    return this.themes.find((x) => x.type === t)?.icon ?? "bulb";
  }

  protected initials(): string {
    const name = this.auth.user()?.displayName?.trim();
    if (!name) return "?";
    const parts = name.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}
